
const RecipePostController = require('./RecipePostController'); 
const CommentController = require('./CommentController');
const UserController = require('./UserController');
const GameLogicController = require('./GameLogicController');

module.exports = {
	recipepost: RecipePostController,
	comment: CommentController,
	user: UserController,
	gamelogic: GameLogicController
}