var state;
var cardAside = -1;
var users = [];
var players = [];
var playerNumber = -1;
var gameData = {};
var deckOriginalLength = -1;
var remainingCards = -1;

var my_user = -1;
var my_hand = [];
var pile = [];
var socket = io();
var options = {};

var booleanOptionList = {}
var numberOptionList = {}

var room;
var translate;
var animationID;
var cardsCleared = 0;
var isActionAvailable=false;
var pileTemp = undefined;
var cardReveal = undefined
const jitsiDomain = 'meet.jit.si';
var jitsiOptions;
var jitsiApi;

var cardSizes = {card_in_pile: 2, card_in_trick:1.2, card_in_hand:1.2};

function main(roomName, lang) {

  // Move card from your hand to the pile
  $("body").on("click", ".card_in_hand", function () {
    if(isGameDisconnected() || isSpectatorOrGuest()) return; 

    // If reorder possible do nothing
    if ($("#option_reorder").prop("checked")) return;

    var card = my_hand[$(".card_in_hand").index($(this))];
    if (isMyTurn() || card.type == CARD.NOPE || options.back_card) {
      putCardOnPileFromHand(this)
    }

  });

  $("body").on("mouseover", ".card_in_hand", function () {
    var card = my_hand[$(".card_in_hand").index($(this))];
    $("#help").text(translate("rule-"+card.type));
  });
  $("body").on("mouseover", ".card_in_pile", function () {
    if(!options.back_card){ 
      var card = pile[$(".card_in_pile").index($(this))];
      $("#help").text(translate("rule-"+card.type));
    } else {
      $("#help").text(translate("Card exchange in progress"));
    }
  });
  $("body").on("mouseout", ".card", function () {
    $("#help").text(translate(HELP_TEXT));
  });
  $("body").on("click", ".guest_effect", function () { 
    if(isOwner()) {
      acceptUser($(this).attr("userid")) ; 
    }
  });

  // Move card from the pile to your hand
  $("body").on("click", ".card_in_pile", function () {
    if(isGameDisconnected() || isSpectatorOrGuest()) return; 

    // If we are playing and in action blocked mode and it's not my turn do nothing
    if (isMyTurn() && options.back_card) {
      takeCardFromPileToHand(this);
    }

  });


  $("#option_reorder").change(function () {
    drawHand();
  });

  $("#colors_option").change(function () {
    changeCardColor();
  });

  $("body").on("click", ".dropdown-item", function (e) {
    e.preventDefault(); // cancel the link behaviour
    var selText = $(this).text();
    $("#gameStyleDrop").text(selText);
    options = CONFIGS[selText]
    options.config_name = selText
    updateOptions();
  });

  room = roomName

  var config = {
      ns: ['game'],
      defaultNS: 'game',
      nonExplicitWhitelist : true,
    };

  if (lang) {
    config.lng = lang
  }

  i18next.use(i18nextXHRBackend ).use(i18nextBrowserLanguageDetector)
    .init(config, (err, t) => {
      translate = t
      emitToServer(ACTIONS.CONNECT_ROOM, roomName)
      jitsiOptions = {
          roomName: 'Virtual-Deck-Of-Cards_'+roomName,
          width: SIDE_NAV_WIDTH,
          height: 500,
          parentNode: document.querySelector('#mySidenav')
      };
      init()
    });
}

function createSpectatorModeMessage() {
  if(isGuest())  {
    var url = `onclick="openRules()"`;
    return `<div class="alert alert-primary" role="alert" ${url}>
            ${translate("Your are on the guest list")}. ${translate("Click here to read the rules")}
          </div>`;  
  }
  return `<div class="alert alert-warning" role="alert">
            ${translate("You are in spectator mode")}
          </div>`;
}

function createMessage(message, type="primary", id="", url="") {
  if(isSpectatorOrGuest()) return createSpectatorModeMessage();
  if(id) {
    id = `id="${id}"`;
  }
  if(url) {
    url = `onclick="window.open('${url}','mywindow');"`;
  } 
  return `<div ${id} ${url} class="alert alert-${type}" role="alert">
            ${translate(message)}
          </div>`;
}

function createHelpMessage() {
  // ${createMessage(HELP_TEXT, "info", "help", translate("url-rule"))}
  if(isSpectatorOrGuest()) return createSpectatorModeMessage();
  return `<div id="help" onclick="openRules()" class="alert alert-info" role="alert">
            ${translate(HELP_TEXT)}
          </div>`;
}

function createActionMessage(message, card) {
  if((isMyTurn() && card == undefined) ||  (isMyTurn() && card.username == my_user.name)) {
    return `<div class="alert alert-info" role="alert">
              ${translate(message)}
            </div>`;
  } else {
    return `<div class="alert alert-primary" role="alert">
              ${translate("Player can")} "${translate(message)}"
            </div>`;
  }
}

function createActionButton(title, jsAction, card) {
  if((isMyTurn() && card == undefined) ||  (isMyTurn() && card.username == my_user.name)) {
    return `<button onclick = '${jsAction}' class = 'btn btn-outline-dark btn-lg btn-block margin_bottom'>
              ${translate(title)}
            </button>`;
  } else {
    return `<div class="alert alert-primary" role="alert">
              ${translate("Player can")} "${translate(title)}"
            </div>`;
  }
};

function createButton(title, jsAction, clazz="") {
  if(isSpectatorOrGuest()) return "";

  return `<button onclick = '${jsAction}' class = 'btn btn-outline-dark btn-lg btn-block ${clazz}'>
            ${translate(title)}
          </button>`;
};

function reconnect() {
  socket.connect();
  //TODO improve emit by https://stackoverflow.com/questions/3914557/passing-arguments-forward-to-another-javascript-function/3914600
  socket.emit(ACTIONS.RECONNECT_ROOM, room, my_user);  
}

socket.on(ACTIONS.USER_RECONNECTION_FAILED, function() {
  $("#mainDeck").empty();
  $content = `
    <div class="row w-100">
      <div class="col-8 form-group">
        ${createMessage("Can't reconnect! Reload the page (your hand and tricks will be lost)", "danger")}
        <br />
        ${createButton("Reload", "document.location.reload(true)")}
      </div>
    </div>
    `;
  $("#mainDeck").append($content);
})

socket.on(ACTIONS.DISCONNECT, function(){
  $("#mainDeck").empty();
  $content = `
    <div class="row w-100">
        <div class="col-8 form-group">
          ${createMessage("You are disconnected!", "warning")}
          <br />
          ${createButton("Reconnect", "reconnect()")}
        </div>
    </div>
    
  `;
  $("#mainDeck").append($content);
});

window.onbeforeunload = function (event) {
  event.returnValue = translate('Refreshing the page will make you disconnect from the game!');
};

socket.on(ACTIONS.ASK_USER_INFO, function () {
  /*First initialisation*/
  if (my_user == -1) {
    var randomRoger = "roger" + Math.floor(Math.random() * 100);
    var nameTemp = prompt(translate("What's your name ?"), randomRoger);
    if (nameTemp == null) {
      nameTemp = randomRoger;
    }
    my_user = {
      id: socket.id,
      date: Date.now(),
      name: nameTemp,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    };
  }
  emitToServer(ACTIONS.SEND_USER_INFO, my_user);
});

socket.on(ACTIONS.UPDATE_HAND, function (data) {
  console.log("===== Update Hand =====");
  my_hand = data;
  drawHand();
});


socket.on(ACTIONS.LOG_ACTION, function (who, what) {
  if(what != ACTIONS.END_TURN) {
    $("#logMessage").text(`${who} ${translate(what)}`);
  }
});

function isExist(value) {
  return value != undefined
}

function isMyTurn() {
  if(playerNumber != -1 && players[playerNumber] != undefined)  {
    return players[playerNumber].id == my_user.id;
  }
  return false;
}

socket.on(ACTIONS.REVEAL_PLAYERS_CARDS, function (hands) {
  drawPileRevealCards(hands);
});

socket.on(ACTIONS.UPDATE_DATA, function (data) {
  console.log(">>>>> New data broadcasted >>>>>");
  console.log(data);
  
  // When something happened clear menu to avoid action conurrence and data discrepancy
  $(".context-menu-list").hide();

  var reDrawHand = false;
  var reDrawPile = false;
  var reDrawDeck = false;
  var reDrawUsersInfo = false;

  if ( isExist(data.options) ) {
    options = data.options;
    reDrawDeck = true;
    reDrawPile = true;
    reDrawUsersInfo = true
    if(options.visio) {
      if(jitsiApi == undefined) {
        jitsiApi = new JitsiMeetExternalAPI(jitsiDomain, jitsiOptions);
      }
      $("#show_visio").visible()
    } else {
      $("#show_visio").invisible()
    }
  }
  if ( isExist(data.hand) ) {
    my_hand = data.hand;
    reDrawHand = true;
  }
  if ( isExist(data.deckOriginalLength) ) {
    deckOriginalLength = data.deckOriginalLength;
    reDrawDeck = true;
  }
  if ( isExist(data.remainingCards) ) {
    remainingCards = data.remainingCards;
    reDrawDeck = true;
  }
  if ( isExist(data.pile) ) {
    pile = data.pile;
    reDrawPile = true;
  }
  if ( isExist(data.users) ) {
    users = data.users;
    reDrawDeck = true;
    reDrawUsersInfo = true;
  }
  if ( isExist(data.players) ) {
    players = data.players;
    reDrawDeck = true;
    reDrawUsersInfo = true;
  }
  if( isExist(data.playerNumber) ) {
    playerNumber = data.playerNumber;
    reDrawUsersInfo = true;
    reDrawDeck = true;
  }
  if ( isExist(data.gameData) ) {
    gameData = data.gameData;
    reDrawUsersInfo = true;
  }
  if ( isExist(data.state) ) {
    state = data.state;
    reDrawDeck = true;
  }
  if ( isExist(data.cardAside) ) {
    cardAside = data.cardAside;
    reDrawDeck = true;
  }
  if ( isExist(data.my_user) ) {
    my_user=data.my_user
    refresh();
    if(isOwner()) {
      $("#reset_button").show();
    } else {
      $("#reset_button").hide();
    }
  }
  if ( isExist(data.cardsCleared) ) {
    cardsCleared = data.cardsCleared;
    reDrawPile = true;
  }
  if ( isExist(data.cardReveal) ) {
    cardReveal = data.cardReveal;
    reDrawDeck = true;
  }
  if ( isExist(data.isActionAvailable) ) {
    isActionAvailable = data.isActionAvailable;
    reDrawPile = true;
  }

  if (reDrawDeck) drawDeck();
  if (reDrawHand) drawHand(data.instruction == true);
  if (reDrawPile) drawPile();
  if (reDrawUsersInfo) drawUsersInfos();
  
  if(isExist(data.action)) {
    playAction(data.action);
  }

});

function refresh() {
  drawDeck();
  drawHand();
  drawPile();
  drawUsersInfos();
}

function emitToServer(action, param=undefined) {

  // emit.apply(this, arguments);
  if(isGameDisconnected()) return; 

  debug("emit", action)
  if(param != undefined) {
    socket.emit(action, param);
  } else {
    socket.emit(action);
  }

}

function broadcastUpdate(data) {
  if(isGameDisconnected()) return; 

  emitToServer(ACTIONS.BROADCAST_UPDATE, data);
}

function updateOptions() {
  if(isGameDisconnected()) return; 

  broadcastUpdate({ action: ACTIONS.UPDATE_OPTION, options: options})
}

function takeCardAside() {
  my_hand.push(cardAside);
  cardAside = -1;
  updateMyHand();
  broadcastUpdate({ action: ACTIONS.TAKE_CARD_ASIDE, cardAside: cardAside })
  drawHand();
}

function removeCardAside() {
  cardAside.hidden = true
  pile.push(cardAside)
  cardAside = -1;
  broadcastUpdate({ action: ACTIONS.REMOVE_CARD_ASIDE, cardAside: cardAside, pile: pile })
}

function takeCardFromPileToHand(item=undefined) {
  var action;
  if(item != undefined) {
    action = ACTIONS.TAKE_BACK_CARD;
    var cardIndex = $(".card_in_pile").index($(item));
    var cardIndex = options.stack_visible && options.inverse_pile ? pile.length - 1 - cardIndex : cardIndex;
    var card = pile[cardIndex];

    my_hand.push(card);
    pile.splice(cardIndex, 1);
  
    updateMyHand();
  } else {
    action = ACTIONS.TAKE_BACK_ALL_CARDS;
    for (c = 0; c < pile.length; c++) {
      var card = pile[c];
      my_hand.push(card);
      
      updateMyHand();
    }
    pile = [];
  }
  broadcastUpdate({ action: action, pile: pile })
  drawHand();
}

function putCardOnDeck(item=undefined) {
  if(item != undefined) {
    isActionAvailable = false;
    var position = prompt(translate("Where do you want to put it top ")+` 1 -> ${remainingCards+1} bottom ?`, 1);
    if(position != null && !isNaN(position)) {
      if(position > remainingCards+1){
        position = remainingCards+1;
      }
      
      var cardIndex = $(".card_in_pile").index($(item));
      var cardIndex = options.stack_visible && options.inverse_pile ? pile.length - 1 - cardIndex : cardIndex;
      var card = pile[cardIndex];
      
      pile.splice(cardIndex, 1);
      
      emitToServer(ACTIONS.PUT_BACK_CARD_DECK, { 
        pile: pile, 
        card: card,
        position: position
      });
    }
  }
}

function putCardOnPileFromHand(item=undefined) {
  var action;
  if(item != undefined) {
    action = ACTIONS.PLAY_CARD;

    var cardIndex = $(".card_in_hand").index($(item));
    var card = my_hand[cardIndex];

    my_hand.splice(cardIndex, 1);
    $(".card_in_hand:eq(" + cardIndex + ")").remove();
    card["username"] = my_user.name;
    pile.push(card);

    updateMyHand();
  } else {
    action = ACTIONS.PLAY_ALL_CARDS;
    for (c = 0; c < my_hand.length; c++) {
      var card = my_hand[c];

      $(".card_in_hand:eq(" + cardIndex + ")").remove();
      card["username"] = my_user.name;
      pile.push(card);

    }
    my_hand = [];
    updateMyHand();
  }

  broadcastUpdate({ action: action, pile: pile, isActionAvailable: true })
  drawHand();
}

function putCardOnPileFromTrick(item=undefined) {
  var trickNumber = item[0].parentNode.getAttribute("trickNumber");
  var cardNumber = item[0].parentNode.getAttribute("cardNumber");

  var card = gameData[my_user.id].tricks[trickNumber][cardNumber];

  pile.push(card);
  gameData[my_user.id].tricks[trickNumber].splice(cardNumber, 1);
  if(gameData[my_user.id].tricks[trickNumber].length == 0)  {
    gameData[my_user.id].tricks.splice(trickNumber, 1)
  }

  broadcastUpdate({ action: ACTIONS.PLAY_CARD, pile: pile, gameData: gameData })
}

function userLost(){
  putCardOnPileFromHand()
  emitToServer(ACTIONS.END_TURN);
  emitToServer(ACTIONS.REMOVE_USER, my_user.id);
}

function start() {
  forEach(booleanOptionList, function (value, prop, obj) {
    syncBooleanOption(prop)
  });

  forEach(numberOptionList, function (value, prop, obj) {
    syncNumberOption(prop)
  });

  updateOptions()
  resetRound();
}

function clearPlayingArea() {
  if (confirm(translate("Are you sure, you want to clear the playing area?"))) {
    emitToServer(ACTIONS.CLEAR_AREA)
  }
}

function cleanCard(card) {
  delete card.pile_up
}

function pileUpPlayingArea() {
    pile.forEach(card => {
      card.pile_up = true
    });
    broadcastUpdate({ action: ACTIONS.PILE_UP_AREA, pile: pile })
}

function dispersePlayingArea() {
  pile.forEach(card => {
    card.pile_up = false
  });
  broadcastUpdate({ action: ACTIONS.DISPERSE_AREA, pile: pile })
}

function createMenu(selector, items) {
  $.contextMenu({
    selector: selector, 
    callback: function(key, options) {
      onOptionMenu(key, options);
    },
    items: items
  });
}

function init() {
  createMenu(".player_number", {
    [ACTIONS.RANDOM_FIRST_PLAYER]: {name: translate("choose randomly"), icon: "fas fa-hand-paper", visible: function(key, opt){return isOwner();}},
    [ACTIONS.REVEAL_PLAYERS_CARDS]: {name: translate(ACTIONS.REVEAL_PLAYERS_CARDS), icon: "fas fa-eye", visible: function(key, opt){return isOwner()}},
    [ACTIONS.REFRESH_BOARD]: {name: translate(ACTIONS.REFRESH_BOARD), icon: "fas fa-sync", visible: function(key, opt){return isPlayer();}},
  });
  createMenu(".user_profil_menu", {
    [ACTIONS.CHANGE_TURN]: {name: translate("attack!"), icon: "fa-hand-paper", visible: function(key, opt){return isOwner() || actionCard(CARD.TARGETED_ATTACK);}},
    [ACTIONS.EXPULSE_USER]: {name: translate("expel"), icon: "fa-ban", visible: function(key, opt){return isOwner()}}
  });
  createMenu(".card_in_pile.exploding", {
    [ACTIONS.PUT_BACK_CARD_DECK]: {name: translate("defuse"), icon: "fa-hand-lizard", visible: function(key, opt){return isMyTurn() && isActionAvailable;}},
    [ACTIONS.PILE_UP_AREA]: {name: translate("pile up"), icon: "fa-align-justify", visible: function(key, opt){return !options.inverse_pile && isPlayer();}},
    [ACTIONS.DISPERSE_AREA]: {name: translate("disperse"), icon: "fa-columns", visible: function(key, opt){return !options.inverse_pile && options.stack_visible && isPlayer();}},
    [ACTIONS.TAKE_BACK_CARD]: {name: translate("take this card"), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
    [ACTIONS.TAKE_BACK_ALL_CARDS]: {name: translate(ACTIONS.TAKE_BACK_ALL_CARDS), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
    [ACTIONS.INCREASE_SIZE]: {name: translate(ACTIONS.INCREASE_SIZE), icon: "fa-search-plus"},
    [ACTIONS.DECREASE_SIZE]: {name: translate(ACTIONS.DECREASE_SIZE), icon: "fa-search-minus"},
  });
  createMenu(".card_in_pile", {
    [ACTIONS.PILE_UP_AREA]: {name: translate("pile up"), icon: "fa-align-justify", visible: function(key, opt){return !options.inverse_pile && isPlayer();}},
    [ACTIONS.DISPERSE_AREA]: {name: translate("disperse"), icon: "fa-columns", visible: function(key, opt){return !options.inverse_pile && options.stack_visible && isPlayer();}},
    [ACTIONS.TAKE_BACK_CARD]: {name: translate("take this card"), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
    [ACTIONS.TAKE_BACK_ALL_CARDS]: {name: translate(ACTIONS.TAKE_BACK_ALL_CARDS), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
    [ACTIONS.INCREASE_SIZE]: {name: translate(ACTIONS.INCREASE_SIZE), icon: "fa-search-plus"},
    [ACTIONS.DECREASE_SIZE]: {name: translate(ACTIONS.DECREASE_SIZE), icon: "fa-search-minus"},
  });
  createMenu(".card_in_hand", {
    [ACTIONS.SHUFFLE_HAND]: {name: translate("shuffle"), icon: "fa-hand-lizard"},
    [ACTIONS.PLAY_ALL_CARDS]: {name: translate(ACTIONS.PLAY_ALL_CARDS), icon: "fa-hand-lizard"},
    [ACTIONS.INCREASE_SIZE]: {name: translate(ACTIONS.INCREASE_SIZE), icon: "fa-search-plus"},
    [ACTIONS.DECREASE_SIZE]: {name: translate(ACTIONS.DECREASE_SIZE), icon: "fa-search-minus"}
  });
  
  $("#show_visio").text(translate("Show visio"));
  $("#reset_button").text(translate("Reset"))
  $("#sort_button").text(translate("Sort"))
  $("#instruction").append(translate("instruction"))
  $('#option_reorder').bootstrapToggle({
    off: translate("Play"),
    on: translate("Reorder")
  });
  setOptionToggle("colors_option", "Cards colors", "4 colors", "2 colors");
  setOptionToggle("card_sound_option", "Cards sounds");
  setOptionToggle("game_sound_option", "Game sounds");
}

function alertSpectatorMode() {
  alert(translate("In spectator mode menu and button are disabled!"));
}

function onOptionMenu(name, op) {
  switch(name) {
    case ACTIONS.CHANGE_TURN: changeTurn(op); break;
    case ACTIONS.RANDOM_FIRST_PLAYER: randomFirstPlayer(); break;
    case ACTIONS.REVEAL_PLAYERS_CARDS: revealCards(); break;
    case ACTIONS.ACCEPT_USER: acceptUser(op.$trigger.attr("userid")); break;
    case ACTIONS.EXPULSE_USER: expulseUser(op); break;
    case ACTIONS.CLEAR_AREA: clearPlayingArea(); break;
    case ACTIONS.CLAIM_TRICK: claimTrick(); break;
    case ACTIONS.PILE_UP_AREA: pileUpPlayingArea(); break;
    case ACTIONS.DISPERSE_AREA: dispersePlayingArea(); break;
    case ACTIONS.TAKE_BACK_CARD: takeCardFromPileToHand(op.$trigger); break;
    case ACTIONS.TAKE_CARD_ASIDE: takeCardAside(); break;
    case ACTIONS.REMOVE_CARD_ASIDE: removeCardAside(); break;
    case ACTIONS.TAKE_BACK_ALL_CARDS: takeCardFromPileToHand(); break;
    case ACTIONS.PLAY_ALL_CARDS: putCardOnPileFromHand(); break;
    case ACTIONS.SHUFFLE_HAND: shuffleHand(); break;
    case ACTIONS.PUT_CARD_PILE: emitToServer(ACTIONS.PUT_CARD_PILE, 1); break;
    case ACTIONS.PUT_ALL_CARDS_PILE: emitToServer(ACTIONS.PUT_CARD_PILE, remainingCards); break;
    case ACTIONS.PUT_DISCARD_CARDS_PILE: getDiscardPile(); break;
    case ACTIONS.GIVE_CARD_PILE: putCardOnPileFromTrick(op.$trigger); break;
    case ACTIONS.REFRESH_BOARD: refresh(); break;
    case ACTIONS.INCREASE_SIZE: changeCardSize(op, 0.2); break;
    case ACTIONS.DECREASE_SIZE: changeCardSize(op, -0.2); break;
    case ACTIONS.PUT_BACK_CARD_DECK: actionPutBackCard(op.$trigger); break;
  }
}

function actionPutBackCard (item=undefined){
  broadcastUpdate({actionAvailable: false })
  putCardOnDeck(item)
}

function expulseUser(op) {
  const userid = op.$trigger.attr("userid");
  const user = getUser(userid);

  if (confirm(translate(`Are you sure, you want to expulse ${user.name} ?`))) {
    emitToServer(ACTIONS.EXPULSE_USER, userid);
  }
}

function acceptUser(userid) {
  const user = getUser(userid);

  if (confirm(translate("Are you sure, you want to add to the game")+` ${user.name} ? `+translate("This will restart the game"))) {
    emitToServer(ACTIONS.ACCEPT_USER, userid);
  }
}

function changeTurn(op) {
  const userid = op.$trigger.attr("userid");
  const num = getPlayerPlace(userid)
  if(options.turn) {
    options.turn = num+2;
  }
  broadcastUpdate({ action: ACTIONS.CHANGE_TURN,  playerNumber:  num, options: options, isActionAvailable: false })
}

function randomFirstPlayer() {
  const num = Math.floor(Math.random() * players.length);
  if(options.turn) {
    options.turn = num+2;
  }
  broadcastUpdate({ action: ACTIONS.RANDOM_FIRST_PLAYER,  playerNumber: num, options: options  })
}

function revealCards() {
  if (confirm(translate("Are you sure, you want to reveal to everyone players cards?"))) {
    emitToServer(ACTIONS.REVEAL_PLAYERS_CARDS);
  }
}

function changeCardSize(op, value) {
  var clazz = op.selector.substring(1);
  cardSizes[clazz] += value;
  refresh();
}

function setOptionToggle(name, label, on="With", off="Without") {
  $(`#${name}_label`).text(translate(label));
  $(`#${name}`).bootstrapToggle({
    on: translate(on),
    off: translate(off),
    style : "block"
  });
}

function askResetGame() {
  if (confirm(translate("Are you sure, you want to reset the game?"))) {
    emitToServer(ACTIONS.RESET_GAME);
  }
}

function getPlayerPlace(playerID=my_user.id){
  for (var p = 0; p < players.length; p++) {
    if(players[p].id == playerID) {
      return p;
    }
  }
}

function getTricks(userid=my_user.id) {
  if(gameData[userid] != undefined) {
    return gameData[userid].tricks;
  }
}

function claimTrick() {
  if(gameData[my_user.id] == undefined) {
    gameData[my_user.id] = {}
  }
  if(gameData[my_user.id].tricks == undefined) {
    gameData[my_user.id].tricks = []
  }
  gameData[my_user.id].tricks.push(pile);
  broadcastUpdate({ action: ACTIONS.CLAIM_TRICK, gameData: gameData, pile: [], playerNumber: getPlayerPlace() })
}

function playAction(action) {
  console.log("Action: "+action);

  if ($("#card_sound_option").prop("checked")) {
    switch(action) {
      case ACTIONS.SHUFFLE_DECK: playSound("shuffle"); break;
      case ACTIONS.PUT_CARD_ASIDE: playSound("turn_card"); break;
      case ACTIONS.DISTRIBUTE: playSound("distribute"); break;
      case ACTIONS.DRAW_CARD:  playSound("draw_card"); break;
      case ACTIONS.PLAY_CARD:  playSound("play_card2"); break;
      case ACTIONS.RESET_ROUND: playSound("reset_round"); break;
      case ACTIONS.CLAIM_TRICK: playSound("claim_trick"); break;
    }
  }  
  if ($("#game_sound_option").prop("checked") 
            && isMyTurn() 
            && action == ACTIONS.END_TURN) {
    console.log("This is my turn sound");
    setTimeout(function(){ playSound("your_turn3"); }, 500);
  }
}

function playSound(name) {
    console.log("playing sound: "+name);

    var url = `audio/${name}.mp3`;
    var audio = $("#sound_player");
    $('#sound_source').attr("src", url);
    audio[0].pause();
    audio[0].load();//suspends and restores all audio element

    //audio[0].play(); changed based on Sprachprofi's comment below
    audio[0].oncanplaythrough = audio[0].play();
}

function shuffleDeck() {
  emitToServer(ACTIONS.SHUFFLE_DECK);
}

function reverseTurnOrder(){
  options.clockwise = !options.clockwise;
  broadcastUpdate({ action: ACTIONS.REVERSE, options: options})
}

function resetRound() {
  emitToServer(ACTIONS.RESET_ROUND);
}

function takeCard(fromTheTop=true) {
  var data = { hand: my_hand, fromTheTop:fromTheTop };
  emitToServer(ACTIONS.DRAW_CARD, data);
}

function putCardAside() {
  emitToServer(ACTIONS.PUT_CARD_ASIDE);
}

function updateMyHand(){
  emitToServer(ACTIONS.HAND_CHANGE, my_hand);
}

function endTurn() {
  if(isMyTurn()) {
    pileUpPlayingArea()
    emitToServer(ACTIONS.END_TURN);
  }
}

function changeCardColor() {
  const fourColorsclass = "fourColours"
  if ($("#colors_option").prop("checked")) {
    $(".playingCards").addClass(fourColorsclass);
  } else {
    $(".playingCards").removeClass(fourColorsclass);
  }
}
var isNavOpen = false;

function openNav() {
  document.getElementById("mySidenav").style.width = SIDE_NAV_WIDTH+"px";
  isNavOpen = true;
  drawDeck()
}

/* Set the width of the side navigation to 0 */
function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  isNavOpen = false;
  drawDeck()
}


function drawUsersInfos() {
  $("#user_container").empty();
  users.forEach((user) => {
    var number = "";
    var data = gameData[user.id];
    if(state == STATES.CONFIGURATION) {
      number = `🂠 <b> X </b>`
    } else if(data != undefined) {
      if(options.tricks) {
        if(data != undefined && data.tricks != undefined)
          number = " 🂠 <b>" + data.tricks.length + "</b>";
      } else if (data != undefined && data.numberCards != undefined) {
        number = " 🂠 <b>" + data.numberCards + "</b>";
      }
    }
    var userClass = "user_profil"
    if(playerNumber != -1 
      && user != undefined 
      && players != undefined
      && players[playerNumber] != undefined
      && players[playerNumber].id == user.id) {
      userClass +=  " player_turn"
      if(isMyTurn()) {
        userClass += " myturn_effect"
      }
    }
    if(isGuest(user)) {
      userClass += " guest_effect"
    }
    userClass += " user_profil_menu"

    var content = `
          <div class="${userClass}" userid=${user.id}>
            <p class="user_emoji">${user.emoji}</p>
            <p>${user.name}${number}</p>
          </div>
      `;
    $("#user_container").append(content);
  });

  $(".player_number").text(translate("Players") + players.length);
}

function isChecked(name) {
  return options[name] == undefined ? false : options[name];
}

function drawCard(card, clazz, type="div", needToClean=true, back=false) {
  if(card == undefined) {
    return "";
  }

  if(needToClean) {
    cleanCard(card)
  }
  var fontSize = cardSizes[clazz] != undefined? cardSizes[clazz]: 1.2;

  if(back) {
    return `<div class="card back card_in_pile" style='font-size: ${fontSize}em'>*</div>`;
  }
  var cardName = card.value;
  if(card.type == CARD.CAT) {
    cardName = cardName.replace(/[0-9]/g, '');
  }
  return `<${type} class="card figure ${card.type} ${clazz}" 
                    style='background-image: url(images/${card.deck_type}/${cardName}.jpeg); font-size: ${fontSize}em'></${type}>`
}

function createBooleanOption(name, title, descriptionChecked=undefined, description=undefined) {
  if(isSpectatorOrGuest()) return "";

  booleanOptionList[name] = 1;
  var content = `
    <input type="checkbox" class="form-check-input" 
  <input type="checkbox" class="form-check-input" 
    <input type="checkbox" class="form-check-input" 
      id="option_${name}" onclick = 'onOptionChange("${name}")' ${isChecked(name)? "checked" : ""}/>
    <label class="form-check-label option_label" for="option_${name}" >${title}`;
  if (descriptionChecked != undefined && description != undefined) {
    content += `=> ${isChecked(name)? descriptionChecked : description}`;
  }
  content += "</label>";
  return content;
}

function createNumberOption(name, title, defaultValue=0) {
  numberOptionList[name] = defaultValue;
  return `<input  class= "mb-2" type = "number" 
    id = "option_${name}" min="${defaultValue}" value="${defaultValue}"} />
    <label class="form-check-label option_label" for="option_${name}" >${translate(title)}</label>`
}

function createGameConfigs() {
  var content = 
  `<div class="dropdown">
      <button class="btn btn-warning dropdown-toggle" type="button" id="gameStyleDrop"
        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        ${options.config_name == undefined? translate("Preconfiguration"): options.config_name}
      </button>
      <div class="dropdown-menu" aria-labelledby="gameStyleDrop">`;
        forEach(CONFIGS, function (value, prop, obj) {
          content += `<a class="dropdown-item" href="#">${prop}</a>`;
        });
      content += `</div>`;
  content += `</div>`
  return content;
}

function syncBooleanOption(name) {
  options[name] = $("#option_"+name).is(":checked");
}

function syncNumberOption(name) {
  options[name] = $("#option_"+name).val();
}

function drawOptionList() {
  return ` 
  ${createBooleanOption("visio", "Use room visio [beta]", 1)}
  <br />
  ${createBooleanOption("at_least_one_kit", translate("At lease one kit"), translate("Everyone starts with one kit"), translate("You could start without a kit (more difficult)"))}
  <br />
  ${createBooleanOption("inverse_pile", 
                        translate("Inverse discard pile display"), 
                        translate("The last card played is the first display (can't pile up cards)"), 
                        translate("The last card played in the last display (can pile up cards)"))} 
  <br />
  ${createNumberOption("number_decks", "decks of cards", 1)}
  <br/> 
  ${createBooleanOption("extention_imploding", "Add imploding extention deck (wip)  ", 1)}
  `;
}

function drawDeckConfig() {
  return `
      <div class="row w-100">
        <div class="col-6 form-group">
          <h2 class="start_text">${translate("Room")} ${room} <br> ${translate("Everyone in?")}</h2>
          <br />
          ${createButton("Start", "start()")}
        </div>
      </div>
    `;
}

function openRules() {
  window.open(translate("url-rule-original"))
  if(options.extention_imploding) {
    window.open(translate("url-rule-imploding"))
  }
}

function drawDeckDistribute() {
  var content = "";
  content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} ${translate("cards")}</h2><br>`;

  var message = players.length == 1 ? translate("Your are the only player connected!") : `${players.length} ${translate("players")}`;

  content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} ${translate("cards")}</h2><br>`;

  if(isOwner()) {
    content += `
    ${createButton("Distribute", "distributeCards()")} </br>
    <div class="control-group form-inline">`
      content+= `<label class="mb-2" for="distribute_card">${translate("Card to distribute to each player ")} ( ${message} )`
      if(options.at_least_one_kit) {
        content += translate(" + 1 kit ")
      }
      content += `</label>
      <input  class= "mb-2 w-100" type = "number" id = "distribute_card" min="1" max="${Math.floor(deckOriginalLength/players.length)}" placeholder = "${translate("number of cards")}"
                value="${options["cards_distribute"]}"} />`
    content += `</div>`
  } else if(!isSpectatorOrGuest()){
    var url = `onclick="openRules()','mywindow');"`;
    content += `<div class="alert alert-info" role="alert" ${url}>
            ${translate("Wait for the dealer to give you cards")}. ${translate("Click here to read the rules")}
          </div>`;  
  } else {
    content += createSpectatorModeMessage();
  }

  content += "</div>"
    
  if (cardAside != -1) {
    content += `<div class = 'col-6 playingCards faceImages'> ${drawCard(cardAside, "card_aside", "span")}</div>`;
  } else if(!options.all_cards && (!options.block_action || isMyTurn())){
    content += `
      <div class = 'col-6 playingCards'>
        ${drawStack()}
      </div>
    `;
  }
  return content;
}

function askResetRound() {
  if (confirm(translate("Are you sure, you want to get all the cards?"))) {
    resetRound()
  }
}

function readyToPlay() {
  broadcastUpdate({action: ACTIONS.READY_TO_PLAY, state: STATES.PLAYING})
}

function getDiscardPile(){
  emitToServer(ACTIONS.GET_DISCARD_PILE);
}

function drawStack() {
  var cardsContent = "";
  for (i = 0; i < 4; i ++ ) {
    cardsContent += `<li><div class="card back deck_stack_card">*</div></li>`
  }
  return `<ul class="deck_stack deck">${cardsContent}</ul>`;
}

function drawDeckReveal() {
  var content = "";
  content = `<div class = 'col-6'><h2>${translate("action-see-the-future")}</h2><br>`

  content += `${translate("Cards from the top to the bottom of the pile")}<br><br>`

  content += `<div class="playingCards faceImages">`
  for (var i = 0; i < cardReveal.length; i++) {
    card = cardReveal[i];
    content += drawCard(card, "card_on_deck");
  }
  content += "</div>";
  content += "</div>";
  return content;
}

function drawDeckPlay() {
  var content = "";

  if (remainingCards == 0) {
    content = `<div class = 'col-6'><h2>${translate("Deck is empty")}</h2><br>`
  } else {
    content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} cards</h2><br>`
  }
  if (isOwner()) {
    content += `${createButton("Get back cards", "askResetRound()")} </br>`;
  }
  if(!isMyTurn()) {
    content += `${createMessage("Wait for your turn!", "info")}`;
  } else if(!options.end_turn_play) {
    content += `${createButton("End turn", "endTurn()")} </br>`;
    if (isNavOpen) {
      content += createButton("Draw a card", "takeCard()")
    }
  }

  if(isGuest()){
    content += `<div class="alert alert-info" role="alert">${translate("Wait to be add to the game")}</div>`;
  } else if (isSpectator()) {
    content += `<div class="alert alert-warning" role="alert">${translate("Refresh to go on guest list")}</div>`;
  }
  if(isPlayer()) {
    content += `${createHelpMessage()}`
  }
  content += "</div>"

  if (remainingCards == 0 && cardAside == -1) {
    content += `<div class = 'col-6'><span class="card_deck">∅</span></div>`;
  } else {
    content += `<div class = 'col-6 playingCards faceImages'>`;
    content += drawStack();

    if (isMyTurn() && !isNavOpen) {
      content += createButton("Draw a card", "takeCard()", "margin_top")
    }
    content += "</div>";
  }     
  return content;
}

function drawDeck() {
  $("#mainDeck").empty();
  $("#playArea").empty();
  var deckContent = "";
  var playContent = "";
  switch(state) {
    case STATES.CONFIGURATION: {
      $("#game_controls").invisible();
      deckContent = drawDeckConfig();
      playContent = drawPileConfig();
      $("#playArea").append(playContent);
      break;
    }
    case STATES.DISTRIBUTION: {
      $("#game_controls").visible();
      deckContent = drawDeckDistribute();
      drawPile();
      break;
    }
    case STATES.PLAYING: {
      $("#game_controls").visible();
      deckContent = drawDeckPlay();
      drawPile();
      break;
    }
    case STATES.REVEAL: {
      $("#game_controls").visible();
      deckContent = drawDeckReveal();
      drawPile();
      break;
    }
  }
  $("#mainDeck").append(deckContent);
}

function drawHand(instruction = false) {
  $("#your_hand").empty();

  var content = "";

  if (instruction) {
    content = `${translate("Read this instructions")} ${my_user.name}`;
    $("#instruction").show();
    $("#cards_control").invisible();
  } else {
    $("#instruction").hide();
    switch (my_hand.length) {
      case 0:
        content = `${translate("Your Hand")} ${my_user.name} ${translate("is empty!")}`;
        $("#cards_control").invisible();
        break;
      case 1:
        content = `${translate("Your Hand")} ${my_user.name}`;
        $("#cards_control").invisible();
        break;
      default:
        content = `${translate("Your Hand")} ${my_user.name} : ${my_hand.length} ${translate("cards")}`;
        $("#cards_control").visible();
    }
  }

  $("#your_hand").append(content);

  $("#cardDisplay").empty();

  $("#cardDisplay").sortable({ disabled: true });
  $("#cardDisplay").sortable({
    start: function (event, ui) {
      ui.item.data("originIndex", ui.item.index());
    },
    change: function (event, ui) {
      var originIndex = ui.item.data("originIndex");
      var currentIndex = ui.placeholder.index();
      ui.item.data("swapIndex", currentIndex);
    },
    stop: function (event, ui) {
      var originIndex = ui.item.data("originIndex");
      var swapIndex = ui.item.data("swapIndex");
      var originElement = my_hand[originIndex];

      if (originIndex < swapIndex) {
        swapIndex -= 1;
        if (swapIndex < 0) swapIndex = 0;
      }
      my_hand.splice(originIndex, 1);
      my_hand.splice(swapIndex, 0, originElement);
    },
  });

  if ($("#option_reorder").prop("checked")) {
    $("#cardDisplay").sortable("enable");
  } else {
    $("#cardDisplay").sortable("disable");
  }

  for (var i = 0; i < my_hand.length; i++) {
    card = my_hand[i];
    var $item = $(drawCard(card, "card_in_hand"))
    $("#cardDisplay").append($item);
  }
}

function drawPileConfig() {
  if(isSpectatorOrGuest()) {return createSpectatorModeMessage();}

  return `
      <h2> ${translate("Game options")} </h2>
      ${createGameConfigs()}
      <div id="option_list" class="col h-100">
      ${drawOptionList()}
    </div>
  `;
}

function actionCard(cardType){ 
  if(isMyTurn() && pile.length >= 1) {
    var card = pile[pile.length-1]
    var currentPlayer = players[playerNumber]
    return card.type == cardType && card.username == currentPlayer.name
  } 
  return false;
}

function drawPile() {
  if(state == STATES.CONFIGURATION) {
    return
  }
  $("#playArea").empty();
  var content = `<h2>${translate("Playing Area (discard pile)")}</h2>`;

  if(options.back_card){
    content += createActionButton("Disable exchange mode", "exchangeMode(false)")
  }
  else if(cardReveal != undefined){
    content += createActionButton("Disable future mode", "revealMode(false)")
  }
  else if(pile.length >= 1) {
    var card = pile[pile.length-1]
    var currentPlayer = players[playerNumber]
    // IF the last card is a nope and is from current player
    if(card.type == CARD.NOPE && card.username == currentPlayer.name) {
      var index = pile.length
      do {
        index--
        card = pile[index]
        console.log(card)
      } while(card.type == CARD.NOPE && index >= 0 )
    }

    if(isActionAvailable) {
        switch(card.type) {
          case CARD.KIT: content += createActionMessage("action-kit", card); break;
          case CARD.TARGETED_ATTACK: content += createActionMessage("action-targeted-attack", card); break;
          case CARD.CAT: 
            if(pile.length >= 2) {
              var card1 = pile[pile.length-1];
              var card2 = pile[pile.length-2];
              var card1type = card1.value.replace(/[0-9]/g, '');
              var card2type = card2.value.replace(/[0-9]/g, '');
              if(card1.username == card2.username && card1type == card2type) {
                content += createActionButton("Enable exchange mode", "exchangeMode(true)");
              }
            }
            break;
            default:
              if(card.type in CARDS_ACTION) {
                content += createActionButton(`action-${card.type}`, `cardAction("${card.type}")`, card);
              }
        }
    }
  }
  $("#playArea").append(content);

  for (var i = 0; i < pile.length; i++) {
    var j = i;
    if(options.stack_visible && options.inverse_pile) {
      j = pile.length - 1 - i;
    }
    card = pile[j];
    var $item = ""
    if (options.back_card) {
      $item = $(drawCard(card, "card_in_pile", "div", false, true));
    } else {
      $item = $(drawCard(card, "card_in_pile", "div", false));
    }
    var $layer = $('<div class="card_layer"/>');
    var $owner = $('<div class="card_owner"/>').text(card.username != undefined ? card.username : ".");
    $layer.append($item);
    $layer.append($owner);
    $layer.draggable({ containment: "parent" });
    if (!options.stack_visible || card.pile_up) {
      $layer.css({ position: "absolute" });
    }
    $("#playArea").append($layer);
  }
}

function cardAction(name) {
  broadcastUpdate({ isActionAvailable: false })
  var data = CARDS_ACTION[name];
  if(data instanceof Object) {
    window[data.func](data.param);
  } else {
    window[data]();
  }
}

function getUser(id) {
  for (u = 0; u < users.length; u++) {
    var user = users[u];
    if(users[u].id == id) {
      return user;
    }
  }
}

function drawPileRevealCards(hands) {
  $("#playArea").empty()
  $("#playArea").append(`<h2>${translate("Players cards")}</h2>`)
  var $content = ''
  forEach(hands, function (hand, prop, obj) {
    if(hand) {
      var user = getUser(prop);
      if(user) {
        $content += `<p>${user.name}</p>`;
      }
      if (hand.length == 0) {
        $content += `<span class="empty_pile">∅</span>`;
      } else {
        $content += `<ul class='hand tricks'>`;
        hand.forEach(card => {
          $content += `<li>${drawCard(card, "card_reveal", "a")}</li>`;
        });
        $content += `</ul>`;
      }
    }
  });
  $("#playArea").append($content);
}

function sortCard() {
  my_hand.sort(function(a, b){
    if(a.type == CARD.CAT) { 
      a.strengh = 1; 
    } else {
      a.strengh = 0; 
    }
    if(b.type == CARD.CAT) { 
      b.strengh = 1; 
    } else {
      b.strengh = 0; 
    }

    if(a.strengh < b.strengh) { return -1; }
    if(a.strengh > b.strengh) { return 1; }

    if(a.value < b.value) { return -1; }
    if(a.value > b.value) { return 1; }
    return 0;
})
  drawHand();
}

function shuffleHand() {
  my_hand = shuffle(my_hand);
  drawHand()
}

function distributeCards() {
  syncNumberOption("cards_distribute")
  
  var numCards = $("#distribute_card").val();
  if (options.all_cards) {
    numCards = -1;
    if(options.hidden_card_aside) {
      numCards = Math.floor((deckOriginalLength - options.hidden_card_aside) / players.length);
    }
  }
  if(numCards > Math.floor(deckOriginalLength/players.length)) {
    numCards = Math.floor(deckOriginalLength/players.length)
  }
  emitToServer(ACTIONS.DISTRIBUTE, { 
    numCards: numCards, 
    hand: my_hand 
  });
}

function onOptionChange(name) {
  options[name] = $("#option_" + name).is(":checked");
  updateOptions();
}

function isSpectatorOrGuest() {
  return my_user == -1 || isGuest();
}

function isGuest(user=my_user) {
  return user != -1 && user.status == USER_STATUS.GUEST;
}

function isSpectator(user=my_user) {
  return user == -1;
}

function isPlayer(user=my_user) {
  return user != -1 && user.status != USER_STATUS.GUEST;
}

function isOwner(user=my_user) {
  return user != -1 && user.status == USER_STATUS.OWNER;
}

function isGameDisconnected() {
  return socket.id == undefined;
}

jQuery.fn.visible = function () {
  return this.css("visibility", "visible");
};

jQuery.fn.invisible = function () {
  return this.css("visibility", "hidden");
};

$(document).on("keypress", function (event) {
    var keycode = event.keyCode ? event.keyCode : event.which;
    if (keycode == "13") {
      switch(state) {
        case STATES.DISTRIBUTION : distributeCards(); break;
        case STATES.PLAYING: {
          if(!options.end_turn_play) {
            endTurn();
          }
          break;
        }
      }
    }
});

function exchangeMode(value) {
  if(value) {
    pileTemp = [...pile];
    options.back_card=true;
    pile = [];
    broadcastUpdate({ pile: pile, options: options});
  } else if( pile.length == 0 ){
    pile = [...pileTemp];
    options.back_card=false;
    pileTemp=undefined
    isActionAvailable = false
    broadcastUpdate({ pile: pile, options: options, isActionAvailable:isActionAvailable});
  } else {
    alert(translate("Ask the other player to get back its cards for continuing (right click to get back)!")); 
  }
}

function revealMode(value){
  if(value) {
    emitToServer(ACTIONS.REVEAL_DECK_CARDS, 3);
  } else {
    state = STATES.PLAYING
    isActionAvailable = false;
    cardReveal = undefined;
    drawDeck();
    drawPile()
    broadcastUpdate({ isActionAvailable:false, cardReveal:undefined});
  }
}