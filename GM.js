//Initialize Werewolf function on startup
window.onload = function() {
    window.Werewolf = new Werewolf();
};

//Firebase Initialization
function Werewolf() {
    this.checkSetup();

    //Shortcuts to sign in DOM elements
    this.mainDiv = document.getElementById('main-div');
    
    this.initFirebase();
}

Werewolf.prototype.checkSetup = function() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
            'Make sure you go through the codelab setup instructions and make ' +
            'sure you are running the codelab using `firebase serve`');
    }
};

Werewolf.prototype.initFirebase = function() {
    //Shortcuts to Firebase SDK features
    this.database = firebase.database();
    
    this.setup();
};

Werewolf.prototype.setup = function() {
    this.database.ref('game/players').once('value', function(snapshot) {
        var numPlayers = 0;
        if (snapshot.val()){
            numPlayers = snapshot.val().length;
        }
        // console.log(numPlayers);
        
        this.mainDiv.innerHTML = 
        "<h2> Waiting for players to join...</h2>" + 
        "<h3 id='player-count'> # of players: " + numPlayers + "</h3>" + 
        "<br><button type='button' id='activate-game-button' disabled>Start Game </button>";
        
        this.activateGameButton = document.getElementById('activate-game-button');
     
        this.updateNumPlayers();
        // this.playerInterval = setInterval(this.updateNumPlayers.bind(this), 1000);
     this.activateGameButton.addEventListener('click', this.activateGame.bind(this));
    }.bind(this))
};

Werewolf.prototype.updateNumPlayers = function() {
    this.database.ref('game/players').on('value', function(snapshot) {
        var playerCount = 0;
        if (snapshot.val()){
            playerCount = snapshot.val().length;
        }
        if (playerCount >= 3){
            document.getElementById("activate-game-button").removeAttribute("disabled");
        }
            
        document.getElementById('player-count').innerHTML = "# of players: " + playerCount;
    }.bind(this))
};

Werewolf.prototype.activateGame = function(){
    this.database.ref('game/players').off('value');
    
//    clearInterval(this.playerInterval);
    this.database.ref('game/isGameActive').set(true, function(error) {
        if(error) {
            console.log(error);
        }
        else {
            this.assignRoles();   
        }
    }.bind(this))
    
};

Werewolf.prototype.assignRoles = function() {
    this.database.ref('game/players').once('value', function(snapshot){
        console.log(snapshot.val());
        var shuffledPlayers = shuffle(snapshot.val());
        console.log(shuffledPlayers);
        shuffledPlayers[0].role = "seer";
        shuffledPlayers[1].role = "doctor";
        shuffledPlayers[2].role = "werewolf";
        
        var j = 1;
        
        for (var i = 3; i < snapshot.val().length; i++){
            if (j < Math.floor(snapshot.val().length / 5)){
                shuffledPlayers[i].role = "werewolf";
                j++;
            }
            else{
                shuffledPlayers[i].role = "villager";
            }
        }
        console.log(shuffledPlayers);
        
        var roleUpdates = {};
        roleUpdates['game/players'] = shuffledPlayers;
        this.database.ref().update(roleUpdates, function(error){
            if(error){
                console.log(error);
            }
            else{
                this.database.ref('game/areRolesAssigned').set(true, function(error){
                    if (error){
                        console.log(error);
                    }
                    else{
                        this.showPlayerTable();
                    }
                }.bind(this));
            }
        }.bind(this));
    }.bind(this))
}

Werewolf.prototype.showPlayerTable = function() {
    this.mainDiv.innerHTML = 
        "<div id= 'winner'></div>" +
        "<table id= 'playerTable'> <thead> <th>Name</th>" +
        "<th>Role</th> <th>Kill</th> <tbody id= 'players'></tbody>";
    
    this.database.ref('game/players').once('value', function(snapshot){
        var players = snapshot.val();
        for (var i = 0; i < snapshot.val().length; i++){
            var playerAttr = document.createElement("TR");
            var nameTableNode = document.createElement("TD");
            var roleTableNode = document.createElement("TD");
            var deadTableNode = document.createElement("TD");
            var nameNode = document.createTextNode(players[i].name);
            var roleNode = document.createTextNode(players[i].role);
            var deadNode = document.createElement("BUTTON");
            deadNode.setAttribute("id", "killPlayer" + i);
            deadNode.setAttribute("type", "button");
            deadNode.setAttribute("data-index", i);
//            var buttonType = document.createAttribute("type");
//            buttonType.value = "button";
//            var buttonID = document.createAttribute("id");
//            buttonID.value = "i";
            nameTableNode.appendChild(nameNode);
            roleTableNode.appendChild(roleNode);
            deadTableNode.appendChild(deadNode);
            playerAttr.appendChild(nameTableNode);
            playerAttr.appendChild(roleTableNode);
            playerAttr.appendChild(deadTableNode);
            document.getElementById("players").appendChild(playerAttr);
            
            document.getElementById("killPlayer" + i).addEventListener('click', function() {
                this.killPlayer(event.target);
            }.bind(this));
        }
    }.bind(this))
}

Werewolf.prototype.killPlayer = function(event) {
    var index = event.getAttribute('data-index');
    console.log(index);
    
    var updates = {};
    updates['game/players/' + index + '/isDead'] = true; 
    
    this.database.ref().update(updates, function(error) {
        if(error) {
            console.log(error);
        }
        else {
            event.setAttribute('disabled', true);
            this.checkEndGame();
        }
    }.bind(this))
}

Werewolf.prototype.checkEndGame = function() {
    this.database.ref('game/players').once('value', function(snapshot) {
        var players = snapshot.val();
        
        var numVillagers = 0;
        var numWolves = 0;
        var doctorAlive = false;
        
        for(var i = 0; i < players.length; i++) {
            if(!players[i].isDead && players[i].role == "werewolf") {
                numWolves++;
            }
            else if(!players[i].isDead && players[i].role == "doctor") {
                doctorAlive = true;
                numVillagers++;
            }
            else if(!players[i].isDead) {
                numVillagers++;
            }
        }
        
        if (numWolves >= numVillagers){
            this.endGame("Werewolves");
        }
        else if (numWolves == 0){
            this.endGame("Villagers");
        }
//        else if (!doctorAlive && (numWolves + 1 == numVillagers))
        
    }.bind(this))
}

Werewolf.prototype.endGame = function(winner) {
    this.database.ref("game/isGameOver").set(true, function(error){
        if (error){
            console.log(error);
        }
        else{
            document.getElementById("winner").innerHTML =
                "<h2>" + winner + " WIN!!!!!</h2>" +
                "<button type= 'button' id= 'resetButton'> Reset </button>";
            document.getElementById("resetButton").addEventListener('click', this.resetGame.bind(this));
            
            this.database.ref("game/winningTeam").set(winner, function(error){
                if (error){
                    console.log(error);
                }
            })
        }
    }.bind(this))

}

Werewolf.prototype.resetGame = function() {
    var updates = {};
    updates["game/players"] = [];
    updates["game/isGameActive"] = false;
    updates["game/areRolesAssigned"] = false;
    updates["game/isGameOver"] = false;
    updates["game/winningTeam"] = "";
    this.database.ref().update(updates, function(error){
        if (error){
            console.log(error);
        }
        else{
            location.reload();
        }
    })
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}