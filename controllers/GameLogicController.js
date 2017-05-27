const sendJsonResponse = (res, status, content) => {
		res.status(status).json(content);
	}

let gameRooms = {};

module.exports =  {


    //data includes room id, host, and array of players
    createRoom(hostSocket) {
        //TODO add socket.host = true so on host diconnect you can alert an action telling all players that the host is gone?
                
        //create a room object with gameroomid, host, players 
        //let room = controller.gamesetup.createGameRoom(socket);
        let gameRoomId = Math.floor( 1000 + Math.random() * 9000 );

        let host = {
            id: hostSocket.id,
            name: hostSocket.name
        }
        
        //create room obj
        let room =  {
            id: gameRoomId,
            host,
            players: [ host ],
            round: null,
            playersAlive: [],
            playersDead: [],
            playing: false
        };

        //add room to gameRooms
        gameRooms[room.id] = room;

        //return a copy of gameRooms[room.id]
        return Object.assign({}, gameRooms[room.id])
    },
    //check if room exists before trying to join
    doesRoomExistAndWantPlayers(roomID) {
        //return true or false depending on whether room exists and isnt playing
        console.log(gameRooms[roomID])
     
        return gameRooms[roomID] && !gameRooms[roomID].playing
  
    },
    //add a new player (1st arg) to the roomID(2nd arg)
    addJoiningPlayer(joinerSocket, roomID) {
    

        let currentGameRoom = gameRooms[roomID];
        //update gameRooms array info
        currentGameRoom.players.push({name:joinerSocket.name, id:joinerSocket.id});
        //return a copy of gameRooms[roomID]
        return Object.assign({}, currentGameRoom)


        console.log('ERROR: Room Doesnt exist')
    
    },
    startGame(roomObj) {
        console.log('STARTING THE GAME IN THE CONTROLLER. HERS THE DATA THE CONTROLLER RECEIVED', roomObj);
        //init each player in game with bullets, shielded, current move 
        let playersAlive = roomObj.players.map((player, index)=>{
            let playerAlive = Object.assign({}, player);

            playerAlive['bullets'] = 0;
            playerAlive['blocked'] = false;
            playerAlive['currentMove'] = null; //maybe have it as an object {move: 'shoot', target: 'playername'}
            return playerAlive
        });
        console.log('heres players alive', playersAlive)
        //returns a game room obj
        let inittedRoom = Object.assign({}, roomObj, {
            id: roomObj.id,
            host: roomObj.host,
            players: roomObj.players,
            round: 1,
            movesMadeThisRound: 0,
            playersAlive,
            playersDead: [],
            playing: true,
            startNextRoundVotes: 0,
            results: []
        });

        gameRooms[inittedRoom.id] = inittedRoom;

        //return a copy of gameRooms[roomID]
        return Object.assign({}, gameRooms[inittedRoom.id])
    },

    updatePlayerMove(playerObj, roomObj) {
        console.log('UPDATING PLAYER MOVE', gameRooms[roomObj.id])
        let currentGameRoom = gameRooms[roomObj.id];
        if(currentGameRoom){

            let curPlayerIndex = this.findPlayerIndexByObjKeyInArray(currentGameRoom.playersAlive, 'id', playerObj.id);
            //set currentMoveReceived to true
        
            let updatedPlayerObj = Object.assign({}, playerObj, {
                currentMoveReceived: true
            });
            console.log('THIS IS THE CURRENTGAMEROOM Before updateing the player move', currentGameRoom);
            console.log('this is the player obj with crrent move received set to true', updatedPlayerObj)
            //overwrite playersAlive in gameRooms with data from action.payload.currentPlayer
            //make a copy of gameRooms and assign a new curPlayer
            if(curPlayerIndex >= 0){

                currentGameRoom.playersAlive[curPlayerIndex] = updatedPlayerObj;
            }
            
            //incrememnt moves made this round
            currentGameRoom.movesMadeThisRound++;
            console.log('heres the updated gameRoom', currentGameRoom)

            if( currentGameRoom.movesMadeThisRound >= currentGameRoom.playersAlive.length ){

                console.log('All moves have been made. Calculating results...')
                console.log('FINISHED GAME ROOM',currentGameRoom)
                console.log('CURERNT PLAYER', updatedPlayerObj)

                let roomCopy = Object.assign({}, currentGameRoom);
                return this.calculateRoundResults(roomCopy);
                //gameLogicController find blocks, make them invulnerable, find reloads, add Bullets, find shots, subtract a bullet, 

                //if bullet less than 0, add you have no bullets to the array of hwat hpapned in round, 
                //find target check if they blocked
                //if the target didnt block remove them from players alive and into playersDead
                //create an array of what happend in the round and send to app.io.in
                //app.io.in show Results of Round
            }//end if calcuarRoundreuslts
            else{
                return Object.assign({}, {
                    room: currentGameRoom,
                    player: updatedPlayerObj
                });
            }
        }//end if currentGameroom

       
    },

    findPlayerIndexByObjKeyInArray(array, objKey, objVal) {
        console.log('heres the array', array)
        console.log('hers the thing youre looking for ', objVal)
        let foundPlayerIndex = array.findIndex((currentEle)=>{

           
            return currentEle[objKey] === objVal;
        });
        console.log('HERES THE foundPlayer', foundPlayerIndex)
        return foundPlayerIndex;
        
    },

    calculateRoundResults(roomObj) {
        let roomWithUpdatedBlocks = this.updateBlocks(roomObj);
        let roomWithUpdatedReloads = this.updateReloads(roomWithUpdatedBlocks);
        let roomWithUpdatedNothing = this.updateNothing(roomWithUpdatedReloads);
        let roomWithUpdatedShoots = this.updateShoots(roomWithUpdatedNothing);
        let roomWithUpdatedPlaying = this.isRoomStillPlaying(roomWithUpdatedShoots);
        
        
        return roomWithUpdatedPlaying;
    },

    updateBlocks(roomObj) {
        let blockResults = [];
        roomObj.playersAlive.forEach((curVal, index, array) => {
            if(curVal.currentMove.move === 'block'){
                curVal.blocked = true;
                blockResults.push(`${curVal.name} Blocked! They are invulnerable during this Round.`)
            } 
        });
        //add results of this block update to roomObj.results
        roomObj.results = roomObj.results.concat(blockResults)
        console.log('HERES THE HANDLEBOLCK ROOM OBj', roomObj)
        return roomObj;
    },

    updateReloads(roomObj) {
        let reloadResults = [];
        roomObj.playersAlive.forEach((curVal, index, array) => {
            if(curVal.currentMove.move === 'reload'){
                curVal.bullets++;
                reloadResults.push(`${curVal.name} Reloaded! They now have ${curVal.bullets} total Bullets.`)
            }
        });
        //add results of this block update to roomObj.results
        roomObj.results = roomObj.results.concat(reloadResults)
        console.log('Heres the HandleRElaods room Obj', roomObj);
        return roomObj;
    },

    updateNothing(roomObj) {
        let nothingResults = [];
        roomObj.playersAlive.forEach((curVal, index, array) => {
            if(curVal.currentMove.move === 'nothing'){
               
                nothingResults.push(`${curVal.name} stood around doing nothing!`)
            }
        });
        //add results of this block update to roomObj.results
        roomObj.results = roomObj.results.concat(nothingResults)
        console.log('Heres the updateNothign room Obj', roomObj);
        return roomObj;
    },

    updateShoots(roomObj) {
        let outerThis = this;
        let shootResults = [];
        let playersToKillOffDelayed = [];
        roomObj.playersAlive.forEach((curVal, index, array) => {
            if(curVal.currentMove.move === 'shoot'){
                //find index of the target of the shot
                let targetIndex = outerThis.findPlayerIndexByObjKeyInArray(roomObj.playersAlive, 'id' , curVal.currentMove.target);
                if( targetIndex < 0 ){
                    targetIndex = outerThis.findPlayerIndexByObjKeyInArray(roomObj.playersDead, 'id' , curVal.currentMove.target);
                    shootResults.push(`${curVal.name} tried to shoot ${roomObj.playersDead[targetIndex].name}, but they're already dead!` );
                }
                else{

                    //if they got bullets
                    if(curVal.bullets > 0){
                        curVal.bullets--;

                        //if taget didnt block theyre dead
                        if(!roomObj.playersAlive[targetIndex].blocked){
                            shootResults.push(`${curVal.name} shot ${roomObj.playersAlive[targetIndex].name} dead!` );
                            //if target curretmove is shoot hold off on splicing them 
                            if(roomObj.playersAlive[targetIndex].currentMove.move === 'shoot' && roomObj.playersAlive[targetIndex].bullets > 0){
                                console.log('pushing to delaying kill', targetIndex)
                                playersToKillOffDelayed.push(roomObj.playersAlive[targetIndex].id)
                            }//end if
                            else{
                                //remove them from the playersAlive array.   splice also returns array of deleted objects so push the first object into playersDead array
                                let deadPlayer = roomObj.playersAlive.splice(targetIndex, 1);

                                console.log('hers deadPlayer', deadPlayer[0]);
                                roomObj.playersDead.push(deadPlayer[0])
                            }//end else 
                            
                        }//end if !blocked
                        //if they did block
                        else{
                            shootResults.push(`${curVal.name} tried to Shoot ${roomObj.playersAlive[targetIndex].name}, but ${roomObj.playersAlive[targetIndex].name} Blocked the Shot!`);
                        }
                    }
                    //if not enough bullets
                    else{
                        shootResults.push(`${curVal.name} tried to shoot ${roomObj.playersAlive[targetIndex].name}, but they fired a blank!`);
                    }
                }
                
            }//end if curMove.move === shoot and bullets > 0
            
        });//end foreach
        //kill off all delayed dead player allowing them to shoot before they die
        for(let i = 0; i < playersToKillOffDelayed.length; i++){
            let delayedDeadPlayerIndex = this.findPlayerIndexByObjKeyInArray(roomObj.playersAlive, 'id', playersToKillOffDelayed[i])
            let delayedDeadPlayer = roomObj.playersAlive.splice(delayedDeadPlayerIndex, 1)
            console.log('heres roomObj after killing delayed player splice', roomObj.playersAlive)
            roomObj.playersDead.push(delayedDeadPlayer[0])
        }
        console.log('heres the room obj after players are killed', roomObj)
        roomObj.results = roomObj.results.concat(shootResults)

        console.log('here are the FINAL RESULTS OF THE ROUND', roomObj.results)
        return roomObj
    },//end updateShoots

    isRoomStillPlaying(roomObj) {
        //if only 1 player remaining set playing to false and push game over to results
        if(roomObj.playersAlive.length <= 1){
            console.log('only 1 player left, game is over')
            roomObj.playing = false; 
            if(roomObj.playersAlive[0] && roomObj.playersAlive[0].name){
                roomObj.results.push(`${roomObj.playersAlive[0].name} is the final Player left standing. ${roomObj.playersAlive[0].name} wins the game!`)
            }
            else{

            roomObj.results.push('Everyone is dead. There are no winners and you all suck.')
            }
            console.log('is room still playing not anymore', roomObj)
            return roomObj
        }
        //if multiple players remaining 
        else{
            console.log('game is stillplaying')
            return roomObj
        }
    },

    prepareNextRound(playerObj, roomObj) {
        console.log('prepareNExtRound playerObj', playerObj)
        console.log('prepareNextRound roomObj', roomObj)
        let currentGameRoom = gameRooms[roomObj.id];
        let curPlayerIndex = this.findPlayerIndexByObjKeyInArray(currentGameRoom.playersAlive, 'id', playerObj.id);
        let updatedPlayerObj;

        //if player is not found in playersAlive then theyre dead and should receive a dead player object
        if(curPlayerIndex < 0){
            console.log('You dead foo')
            curPlayerIndex = this.findPlayerIndexByObjKeyInArray(currentGameRoom.playersDead, 'id', playerObj.id);
            //reset player object
            updatedPlayerObj = Object.assign({}, currentGameRoom.playersDead[curPlayerIndex], {
                currentMoveReceived: false,
                currentMove: null,
                blocked: false,
                alive: false
            });
            
            //overwrite playersAlive in gameRooms with resetPLayerObj
            //make a copy of gameRooms and assign a new curPlayer
            currentGameRoom.playersDead[curPlayerIndex] = updatedPlayerObj;

        }
        else{

            //reset player object
            updatedPlayerObj = Object.assign({}, currentGameRoom.playersAlive[curPlayerIndex], {
                currentMoveReceived: false,
                currentMove: null,
                blocked: false
            });
            
            //overwrite playersAlive in gameRooms with resetPLayerObj
            //make a copy of gameRooms and assign a new curPlayer
            currentGameRoom.playersAlive[curPlayerIndex] = updatedPlayerObj;
        }


        //increament room next round votes
        currentGameRoom.startNextRoundVotes++;
        //return currentPlayer
        
        //if everyone is done looking at results screen and is ready to begin the next round
        if( currentGameRoom.startNextRoundVotes >= currentGameRoom.playersAlive.length ){

            console.log('Ready to prep room for next round')
            

            let roomCopy = Object.assign({}, currentGameRoom);
            let resetRoom = this.resetRoomForNextRound(roomCopy);
            console.log('heres the reestroom', resetRoom)

            return Object.assign({},{
                room: resetRoom,
                player: updatedPlayerObj
            })
            
        }//end if resetRoom

        //if still waiting for everyone to begin next round, just send player data
        else{
            return Object.assign({}, {
                room: currentGameRoom,
                player: updatedPlayerObj
            });
        }


        //prepare next round by getting player id from currentPLayer and overwriting it with the player info within playersAlive array

        //overwrite currentMove with null
        //overwrite blocked with false
        //overwrite results
        //incrememnt round
        //if dead send back currentPlayer dead

    },

    resetRoomForNextRound(roomObj) {
        let currentGameRoom = gameRooms[roomObj.id];

        let resetRoomObj = Object.assign({}, currentGameRoom, {
            movesMadeThisRound: 0,
            round: currentGameRoom.round+=1,
            results: [],
            startNextRoundVotes: 0
        })
        console.log('heres the reset room', resetRoomObj)

        gameRooms[roomObj.id] = resetRoomObj;
        console.log('heres currentGaemRoom The one in server memeory', gameRooms[roomObj.id])

        return resetRoomObj;
        
    }





};