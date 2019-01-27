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

// Checks that the Firebase SDK has been correctly setup and configured.
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
    this.mainDiv.innerHTML = 
        "<input type='text' id='join-game-name' placeholder='Name'></input>" + 
        "<button type='button' id='join-game-button'>Join Game</button>";
    
    this.joinGameName = document.getElementById('join-game-name');
    this.joinGameButton = document.getElementById('join-game-button');
    this.joinGameButton.addEventListener('click', this.joinGame.bind(this));
}

Werewolf.prototype.joinGame = function() {
    this.username = this.joinGameName.value;
    
    this.database.ref('game/players').once('value', function(snapshot) {
        console.log(snapshot.val());
        if(snapshot.val()) {
            var players = snapshot.val();
            players.push({
                name: this.joinGameName.value,
                role: "",
                isDead: false
            });
            
            var updates = {};
            updates['game/players'] = players;
            this.database.ref().update(updates, function(error) {
                if(error) {
                    console.log(error);
                }
                else {
                    this.showWaitScreen();
                }
            }.bind(this));
        }
        else {
            this.database.ref('game/players').set([{
                name: this.joinGameName.value,
                role: "",
                isDead: false
            }], function(error) {
                if(error) {
                    console.log(error);
                }
                else {
                    this.showWaitScreen();
                }
            }.bind(this));
        }
    }.bind(this))
}

Werewolf.prototype.showWaitScreen = function() {
    this.database.ref('game/players').once('value', function(snapshot) {
        console.log(snapshot.val());
        this.mainDiv.innerHTML = "<h1>Hello, " + this.username + "!</h1>" + 
            "<p>Sit back and relax...</p>" + 
            "<p style='font-size: 10%'>and prepare to die!!!!!!!! :)</p>";
        
        this.checkRoles();
//        this.checkRoleReady = setInterval(this.checkRoles.bind(this), 1000);
        
    }.bind(this));
}

Werewolf.prototype.checkRoles = function() {
//   console.log("Checking"); 
    this.database.ref("game/areRolesAssigned").on('value', function(snapshot){
       console.log(snapshot.val());
        if (snapshot.val()){
            this.displayRole();
        }
    }.bind(this));
}

Werewolf.prototype.displayRole = function() {
    this.database.ref("game/areRolesAssigned").off("value");
    
    this.database.ref('game/players').once('value', function(snapshot){
        var players = snapshot.val();
        for (var i = 0; i < snapshot.val().length; i++){
            console.log(i+players[i].name+this.joinGameName.value);
            if (players[i].name == this.joinGameName.value){
                var playerIndex = i;
                this.mainDiv.innerHTML =
                    "<h2> You are a </h2><h1>" +
                    players[i].role + "</h1>";
            }
            
            this.database.ref("game/players/" + playerIndex + "/isDead").on("value", function(snapshot) {
                if(snapshot.val()) {
                    this.displayDead();
                    this.database.ref('game/players/' + playerIndex + "/isDead").off("value");
                }
            }.bind(this));
        }
    }.bind(this));
}

Werewolf.prototype.displayDead = function() {
    this.mainDiv.innerHTML = "<h1 style='font-size: 500%'>GAME<br>OVER</h1>";
}