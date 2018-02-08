let app = require('../app');

//call controller here
const controller = require('../controllers');
let constants = require('../constants/constants');
//catch all remote actions here

let socketConnections = {};

app.io.on('connection', socket => {
  //BACKUP ARRAY keeping track of TOTAL current socket connections and their ids/names
  socketConnections[socket.id] = {
    info: socket,
    name: null
  };
  console.log(
    `socket connected. id: ${socket.id}info ${
      socketConnections[socket.id].info
    }`
  );
  console.log(
    'a user connected. total users: ',
    Object.keys(socketConnections).length
  );

  socket.on('action', action => {
    console.log('SERVER SOCKET.JS CAUGHT AN ACTION', action);
    switch (action.type) {
      case constants.HOST_GAME:
        //save name to socketConnection as Backup
        socketConnections[socket.id].name = action.payload.name;
        //save name to socket
        socket.name = action.payload.name;

        let room = controller.gamelogic.createRoom(socket);
        console.log('heres the room', room);
        //have host join room
        socket.join(room.id);

        console.log(
          'emitting HOST_GAME_SERVER to client',
          constants.HOST_GAME_SERVER
        );
        //return the game room
        return socket.emit('action', {
          type: constants.HOST_GAME_SERVER,
          payload: room
        });

      case constants.JOIN_GAME:
        //save name to socketConnection as Backup
        socketConnections[socket.id].name = action.payload.name;
        //save name to socket
        socket.name = action.payload.name;

        let roomID = action.payload.roomID;

        let doesRoomExistAndWantPlayers = controller.gamelogic.doesRoomExistAndWantPlayers(
          roomID
        );

        if (doesRoomExistAndWantPlayers) {
          let updatedRoom = controller.gamelogic.addJoiningPlayer(
            socket,
            roomID
          );

          //have player join gameroom
          socket.join(roomID);

          //set the current player only for the socket
          socket.emit('action', {
            type: constants.SET_CURRENT_PLAYER_SERVER,
            payload: { id: socket.id, name: action.payload.name }
          });
          //emit to all sockets in the room that a new player has joined
          return app.io
            .in(roomID)
            .emit('action', {
              type: constants.JOIN_GAME_SERVER,
              payload: updatedRoom
            });
        } else {
          //if room doesnt exist send error to client
          console.log('Room dont exist foo');
          let errMsg = `Room ${roomID} either has already begun playing or doesn't exist at all! Please make sure that you have entered a proper four-digit Room ID.`;
          return socket.emit('action', {
            type: constants.JOIN_GAME_FAIL_SERVER,
            payload: errMsg
          });
        }

      case constants.START_GAME:
        console.log('CAUGHT START_GAME ACTION ON SCKET>JS SERVER', action);
        //call game start controller
        let gameState = controller.gamelogic.startGame(action.payload.room);

        return app.io
          .in(action.payload.room.id)
          .emit('action', {
            type: constants.START_GAME_SERVER,
            payload: gameState
          });
      //pass back to clients in room

      case constants.SEND_CURRENT_GAME_STATE:
        console.log(
          'CAUGHT SEND_CURRENT_GAME_STATE ACTION ON SOCKET JS SERVER asdfsdafsdafds',
          action.payload.game.room
        );

        let updatedRoomWithPlayerMove = controller.gamelogic.updatePlayerMove(
          action.payload.currentPlayer,
          action.payload.game.room
        );
        console.log(
          'heres updatedtoomwithplayermove',
          updatedRoomWithPlayerMove
        );

        //if all players have submitted their moves the game logic will instead return the update room with a list of reuslts to be displayed on the screen between rounds to explain what happended in the round
        if (
          updatedRoomWithPlayerMove &&
          updatedRoomWithPlayerMove.results &&
          updatedRoomWithPlayerMove.results.length > 0
        ) {
          console.log(
            'ROUND S ALL DONE HERE IS THE FINAL REUSLTS FDKJDSLFJLSDFJKLDSF',
            updatedRoomWithPlayerMove
          );

          return app.io
            .in(updatedRoomWithPlayerMove.id)
            .emit('action', {
              type: constants.SHOW_ROUND_RESULTS_SERVER,
              payload: updatedRoomWithPlayerMove
            });
        } else {
          let updatedGameState = {
            gameRoom: {
              room: updatedRoomWithPlayerMove.room,
              error: null,
              loading: false
            },
            currentPlayer: updatedRoomWithPlayerMove.player
          };

          return socket.emit('action', {
            type: constants.SEND_CURRENT_GAME_STATE_SERVER,
            payload: updatedGameState
          });
        }

      case constants.START_NEXT_ROUND:
        console.log(
          'CAUGHT START NEXT ROUND ACTION ON SOCKET JS SERVER',
          action
        );

        let nextRoundRoomWithPlayerMove = controller.gamelogic.prepareNextRound(
          action.payload.currentPlayer,
          action.payload.game.room
        );

        let updatedGameState = {
          gameRoom: {
            room: nextRoundRoomWithPlayerMove.room,
            error: null,
            loading: false
          },
          currentPlayer: nextRoundRoomWithPlayerMove.player
        };

        //always update state of socket with updated room and current player
        socket.emit('action', {
          type: constants.RESET_NEXT_ROUND_CURRENT_PLAYER_SERVER,
          payload: updatedGameState
        });
        //run throuhg room obj players alive currentmove null
        if (nextRoundRoomWithPlayerMove.room.movesMadeThisRound === 0) {
          return app.io
            .in(nextRoundRoomWithPlayerMove.room.id)
            .emit('action', {
              type: constants.START_NEXT_ROUND_SERVER,
              payload: nextRoundRoomWithPlayerMove.room
            });
        }
        //if all reset to null appioemit new round
        //app io emit new round and redirect to gamescreen

        return;

      case constants.ALERT_LEAVER:
        console.log('alerting leaver, heres your action ', action);
        let leaverRoomID = action.payload.game.room.id;
        let leaverName = action.payload.currentPlayer.name;
        let leaverErrMsg = `${leaverName} left the game. Leavers ruin the game for everyone :(`;
        return app.io
          .in(leaverRoomID)
          .emit('action', {
            type: constants.ALERT_LEAVER_SERVER,
            payload: leaverErrMsg
          });
    } //end switch
  });

  socket.on('disconnect', data => {
    console.log('BYEBYE', data);
    // if(socketUsers.indexOf(socketConnections[socket.id]['name']) !== -1){
    //     socketUsers.splice(socketUsers.indexOf(socketConnections[socket.id]['name']), 1);
    // }

    delete socketConnections[socket.id];
    console.log(
      ' a user disconnected. total users %s',
      Object.keys(socketConnections).length
    );
  });
});
