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

var cardSizes = {card_in_pile: 2, card_in_trick:1.2, card_in_hand:1.2};

function main(roomName, lang) {

  // Move card from your hand to the pile
  $("body").on("click", ".card_in_hand", function () {
    if(isGameDisconnected() || isSpectatorOrGuest()) return; 

    // If reorder possible do nothing
    if ($("#option_reorder").prop("checked")) return;

    // If we are playing and in action blocked mode and it's not my turn do nothing
    if (state == states.PLAYING && options.block_action && !isMyTurn()) return;

    putCardOnPileFromHand(this)
    // If we are playing and if there is to end the turn on draw, end the turn
    if(state == states.PLAYING && options.end_turn_draw) {
      endTurn();
    }
    
  });
  $("body").on("click", ".guest_effect", function () { 
    if(isOwner()) {
      acceptUser($(this).attr("userid")) ; 
    }
  });
  // Move card from the pile to your hand
  $("body").on("click", ".card_in_pile", function () {
    if(isGameDisconnected() || isSpectatorOrGuest()) return; 

    // If we are playing abd take card from pile is disabled
    if(state == states.PLAYING && options.block_get_cards) return;

    // If we are playing and in action blocked mode and it's not my turn do nothing
    if (state == states.PLAYING && options.block_action && !isMyTurn()) return;

    takeCardFromPileToHand(this);
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
    options = configs[selText]
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
      emitToServer(actions.CONNECT_ROOM, roomName)
      init()
    });
}

function createSpectatorModeMessage() {
  if(isGuest())  {
    return `<div class="alert alert-primary" role="alert">
            ${translate("Your are on the guest list")}
          </div>`;  
  }
  return `<div class="alert alert-warning" role="alert">
            ${translate("You are in spectator mode")}
          </div>`;
}

function createMessage(message, type="primary") {
  if(isSpectatorOrGuest()) return createSpectatorModeMessage();
  
  return `<div class="alert alert-${type}" role="alert">
            ${translate(message)}
          </div>`;
}

function createButton(title, jsAction, clazz="") {
  if(isSpectatorOrGuest()) return "";

  return `<button onclick = '${jsAction}' class = 'btn btn-outline-dark btn-lg btn-block ${clazz}'>
            ${translate(title)}
          </button>`;
};

function reconnect() {
  socket.connect();
  //TODO improve emit by https://stackoverflow.com/questions/3914557/passing-arguments-forward-to-another-javascript-function/3914600
  socket.emit(actions.RECONNECT_ROOM, room, my_user);  
}

socket.on(actions.USER_RECONNECTION_FAILED, function() {
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

socket.on(actions.DISCONNECT, function(){
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

socket.on(actions.ASK_USER_INFO, function () {
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
  emitToServer(actions.SEND_USER_INFO, my_user);
});

socket.on(actions.UPDATE_HAND, function (data) {
  console.log("===== Update Hand =====");
  my_hand = data;
  drawHand();
});


socket.on(actions.LOG_ACTION, function (who, what) {
  if(what != actions.END_TURN) {
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

socket.on(actions.REVEAL_PLAYERS_CARDS, function (hands) {
  drawPileRevealCards(hands);
});

socket.on(actions.UPDATE_DATA, function (data) {
  console.log(">>>>> New data broadcasted >>>>>");
  console.log(data);
  
  // When something happened clear menu to avoid action conurrence and data discrepancy
  $(".context-menu-list").hide();

  var reDrawHand = false;
  var reDrawPile = false;
  var reDrawDeck = false;
  var reDrawUsersInfo = false;
  var reDrawTricks = false;

  if ( isExist(data.options) ) {
    options = data.options;
    reDrawDeck = true;
    reDrawPile = true;
    reDrawUsersInfo = true
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
    if(options.tricks) {
      reDrawTricks = true;
    }
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

  if (reDrawDeck) drawDeck();
  if (reDrawHand) drawHand(data.instruction == true);
  if (reDrawPile) drawPile();
  if (reDrawUsersInfo) drawUsersInfos();
  if (reDrawTricks) drawTricks();
  
  if(isExist(data.action)) {
    playAction(data.action);
  }

});

function refresh() {
  drawDeck();
  drawHand();
  drawPile();
  drawUsersInfos();
  drawTricks();
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

  emitToServer(actions.BROADCAST_UPDATE, data);
}

function updateOptions() {
  if(isGameDisconnected()) return; 

  broadcastUpdate({ action: actions.UPDATE_OPTION, options: options})
}

function takeCardAside() {
  my_hand.push(cardAside);
  cardAside = -1;
  updateMyHand();
  broadcastUpdate({ action: actions.TAKE_CARD_ASIDE, cardAside: cardAside })
  drawHand();
}

function removeCardAside() {
  cardAside.hidden = true
  pile.push(cardAside)
  cardAside = -1;
  broadcastUpdate({ action: actions.REMOVE_CARD_ASIDE, cardAside: cardAside, pile: pile })
}

function takeCardFromPileToHand(item=undefined) {
  var action;
  if(item != undefined) {
    action = actions.TAKE_BACK_CARD;
    var cardIndex = $(".card_in_pile").index($(item));
    var cardIndex = options.stack_visible && options.inverse_pile ? pile.length - 1 - cardIndex : cardIndex;
    var card = pile[cardIndex];

    my_hand.push(card);
    pile.splice(cardIndex, 1);
  
    updateMyHand();
  } else {
    action = actions.TAKE_BACK_ALL_CARDS;
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

function putCardOnPileFromHand(item=undefined) {
  var action;
  if(item != undefined) {
    action = actions.PLAY_CARD;

    var cardIndex = $(".card_in_hand").index($(item));
    var card = my_hand[cardIndex];

    my_hand.splice(cardIndex, 1);
    $(".card_in_hand:eq(" + cardIndex + ")").remove();
    card["username"] = my_user.name;
    pile.push(card);

    updateMyHand();
  } else {
    action = actions.PLAY_ALL_CARDS;
    for (c = 0; c < my_hand.length; c++) {
      var card = my_hand[c];

      $(".card_in_hand:eq(" + cardIndex + ")").remove();
      card["username"] = my_user.name;
      pile.push(card);

    }
    my_hand = [];
    updateMyHand();
  }

  broadcastUpdate({ action: action, pile: pile })
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

  broadcastUpdate({ action: actions.PLAY_CARD, pile: pile, gameData: gameData })
}

function start() {
  forEach(booleanOptionList, function (value, prop, obj) {
    syncBooleanOption(prop)
  });

  forEach(numberOptionList, function (value, prop, obj) {
    syncNumberOption(prop)
  });

  if(options.cards_distribute == undefined) {
    options.cards_distribute = 1;
  }
  
  updateOptions()
  resetRound();
}

function clearPlayingArea() {
  if (confirm(translate("Are you sure, you want to clear the playing area?"))) {
    emitToServer(actions.CLEAR_AREA)
  }
}

function cleanCard(card) {
  delete card.pile_up
}

function pileUpPlayingArea() {
    pile.forEach(card => {
      card.pile_up = true
    });
    broadcastUpdate({ action: actions.PILE_UP_AREA, pile: pile })
}

function dispersePlayingArea() {
  pile.forEach(card => {
    card.pile_up = false
  });
  broadcastUpdate({ action: actions.DISPERSE_AREA, pile: pile })
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
    [actions.RANDOM_FIRST_PLAYER]: {name: translate("choose randomly"), icon: "fas fa-hand-paper", visible: function(key, opt){return isOwner();}},
    [actions.REVEAL_PLAYERS_CARDS]: {name: translate(actions.REVEAL_PLAYERS_CARDS), icon: "fas fa-eye", visible: function(key, opt){return isOwner()}},
    [actions.REFRESH_BOARD]: {name: translate(actions.REFRESH_BOARD), icon: "fas fa-sync", visible: function(key, opt){return isPlayer();}},
  });
  createMenu(".user_profil_menu", {
    [actions.CHANGE_TURN]: {name: translate("your turn"), icon: "fa-hand-paper", visible: function(key, opt){return isPlayer() && state != states.CONFIGURATION;}},
    [actions.EXPULSE_USER]: {name: translate("expel"), icon: "fa-ban", visible: function(key, opt){return isOwner()}}
  });
  createMenu(".card_in_pile", {
    [actions.PILE_UP_AREA]: {name: translate("pile up"), icon: "fa-align-justify", visible: function(key, opt){return !options.inverse_pile && isPlayer();}},
    [actions.DISPERSE_AREA]: {name: translate("disperse"), icon: "fa-columns", visible: function(key, opt){return !options.inverse_pile && options.stack_visible && isPlayer();}},
    [actions.TAKE_BACK_CARD]: {name: translate("take this card"), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
    [actions.TAKE_BACK_ALL_CARDS]: {name: translate(actions.TAKE_BACK_ALL_CARDS), icon: "fa-hand-lizard", visible: function(key, opt){return options.preparation && isPlayer();}},
    [actions.INCREASE_SIZE]: {name: translate(actions.INCREASE_SIZE), icon: "fa-search-plus"},
    [actions.DECREASE_SIZE]: {name: translate(actions.DECREASE_SIZE), icon: "fa-search-minus"},
    [actions.CLAIM_TRICK]: {name: translate("claim trick"), icon: "fa-hand-lizard", visible: function(key, opt){return options.tricks && isPlayer();}},
    [actions.CLEAR_AREA]: {name: translate("clear"), icon: "fa-trash-alt", visible: function(key, opt){return isPlayer();}}
  });
  createMenu(".card_in_hand", {
    [actions.SHUFFLE_HAND]: {name: translate("shuffle"), icon: "fa-hand-lizard"},
    [actions.SORT_VALUE]: {name: translate("sort by value"), icon: "fa-hand-lizard", visible: function(key, opt){return !options.atouts}},
    [actions.PLAY_ALL_CARDS]: {name: translate(actions.PLAY_ALL_CARDS), icon: "fa-hand-lizard", visible: function(key, opt){return options.preparation;}},
    [actions.INCREASE_SIZE]: {name: translate(actions.INCREASE_SIZE), icon: "fa-search-plus"},
    [actions.DECREASE_SIZE]: {name: translate(actions.DECREASE_SIZE), icon: "fa-search-minus"}
  });
  createMenu(".card_aside", {
    [actions.TAKE_CARD_ASIDE]: {name: translate("take this card"), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
    [actions.REMOVE_CARD_ASIDE]: {name: translate("remove"), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
  });
  createMenu(".deck_stack", {
    [actions.PUT_CARD_PILE]: {name: translate("put a card on the pile"), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
    [actions.PUT_ALL_CARDS_PILE]: {name: translate("put all the cards on the pile"), icon: "fa-hand-lizard", visible: function(key, opt){return isPlayer();}},
  });
  createMenu(".card_in_trick", {
    [actions.INCREASE_SIZE]: {name: translate(actions.INCREASE_SIZE), icon: "fa-search-plus"},
    [actions.DECREASE_SIZE]: {name: translate(actions.DECREASE_SIZE), icon: "fa-search-minus"},
    [actions.GIVE_CARD_PILE]: {name: translate("put a card on the pile"), icon: "fa-hand-lizard"},
  });
  
  $("#show_tricks").text(translate("Show my tricks"));
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
    case actions.CHANGE_TURN: changeTurn(op); break;
    case actions.RANDOM_FIRST_PLAYER: randomFirstPlayer(); break;
    case actions.REVEAL_PLAYERS_CARDS: revealCards(); break;
    case actions.ACCEPT_USER: acceptUser(op.$trigger.attr("userid")); break;
    case actions.EXPULSE_USER: expulseUser(op); break;
    case actions.CLEAR_AREA: clearPlayingArea(); break;
    case actions.CLAIM_TRICK: claimTrick(); break;
    case actions.PILE_UP_AREA: pileUpPlayingArea(); break;
    case actions.DISPERSE_AREA: dispersePlayingArea(); break;
    case actions.TAKE_BACK_CARD: takeCardFromPileToHand(op.$trigger); break;
    case actions.TAKE_CARD_ASIDE: takeCardAside(); break;
    case actions.REMOVE_CARD_ASIDE: removeCardAside(); break;
    case actions.TAKE_BACK_ALL_CARDS: takeCardFromPileToHand(); break;
    case actions.PLAY_ALL_CARDS: putCardOnPileFromHand(); break;
    case actions.SHUFFLE_HAND: shuffleHand(); break;
    case actions.SORT_VALUE: sortCardByValue(); break;
    case actions.PUT_CARD_PILE: emitToServer(actions.PUT_CARD_PILE, 1); break;
    case actions.PUT_ALL_CARDS_PILE: emitToServer(actions.PUT_CARD_PILE, remainingCards); break;
    case actions.GIVE_CARD_PILE: putCardOnPileFromTrick(op.$trigger); break;
    case actions.REFRESH_BOARD: refresh(); break;
    case actions.INCREASE_SIZE: changeCardSize(op, 0.2); break;
    case actions.DECREASE_SIZE: changeCardSize(op, -0.2); break;
  }
}

function expulseUser(op) {
  const userid = op.$trigger.attr("userid");
  const user = getUser(userid);

  if (confirm(translate(`Are you sure, you want to expulse ${user.name} ?`))) {
    emitToServer(actions.EXPULSE_USER, userid);
  }
}

function acceptUser(userid) {
  
  const user = getUser(userid);

  if (confirm(translate(`Are you sure, you want to add to the game ${user.name} ?`))) {
    emitToServer(actions.ACCEPT_USER, userid);
  }
}

function changeTurn(op) {
  const userid = op.$trigger.attr("userid");
  const num = getPlayerPlace(userid)
  if(options.turn) {
    options.turn = num+2;
  }
  broadcastUpdate({ action: name,  playerNumber:  num, options: options })
}

function randomFirstPlayer() {
  const num = Math.floor(Math.random() * players.length);
  if(options.turn) {
    options.turn = num+2;
  }
  broadcastUpdate({ action: name,  playerNumber: num, options: options  })
}

function revealCards() {
  if (confirm(translate("Are you sure, you want to reveal to everyone players cards?"))) {
    emitToServer(actions.REVEAL_PLAYERS_CARDS);
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
    emitToServer(actions.RESET_GAME);
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
  broadcastUpdate({ action: actions.CLAIM_TRICK, gameData: gameData, pile: [], playerNumber: getPlayerPlace() })
}

function playAction(action) {
  console.log("Action: "+action);

  if ($("#card_sound_option").prop("checked")) {
    switch(action) {
      case actions.SHUFFLE_DECK: playSound("shuffle"); break;
      case actions.PUT_CARD_ASIDE: playSound("turn_card"); break;
      case actions.DISTRIBUTE: playSound("distribute"); break;
      case actions.DRAW_CARD:  playSound("draw_card"); break;
      case actions.PLAY_CARD:  playSound("play_card2"); break;
      case actions.RESET_ROUND: playSound("reset_round"); break;
      case actions.CLAIM_TRICK: playSound("claim_trick"); break;
    }
  }  
  if ($("#game_sound_option").prop("checked") 
            && isMyTurn() 
            && action == actions.END_TURN) {
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
  emitToServer(actions.SHUFFLE_DECK);
}

function resetRound() {
  emitToServer(actions.RESET_ROUND);
}

function takeCard() {
  var data = { hand: my_hand };
  emitToServer(actions.DRAW_CARD, data);
}

function putCardAside() {
  emitToServer(actions.PUT_CARD_ASIDE);
}

function updateMyHand(){
  emitToServer(actions.HAND_CHANGE, my_hand);
}

function endTurn() {
  if(isMyTurn()) {
    emitToServer(actions.END_TURN);
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

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
}

/* Set the width of the side navigation to 0 */
function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}


function drawTricks(userid=my_user.id) {
  $("#sideArea").empty()
  var tricks = getTricks(userid);
  var $content = ''
  if(tricks != undefined && tricks.length > 0) {
    $("#sideArea").append(`<h4>${translate("Your tricks")}</h4>`);
    for (var t = 0; t < tricks.length; t++) {
      var trick = tricks[t];
      $content += `<ul class='hand tricks'>`;
      for (var c = 0; c < trick.length; c++) {
        var card = trick[c];
        $content += `<li trickNumber="${t}" cardNumber="${c}">${drawCard(card, "card_in_trick", "a")}</li>`;
      }
      $content += `</ul>`;
    }
  } else {
    $("#sideArea").append(`<h4>${translate("You don't have tricks")}</h4>`);
  }
  $("#sideArea").append($content);
}

function drawUsersInfos() {
  $("#user_container").empty();
  users.forEach((user) => {
    var number = "";
    var data = gameData[user.id];
    if(state == states.CONFIGURATION) {
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

  $("body").on("click", ".color_effect", function () {  $(".color_effect").removeClass("color_effect"); });
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
  var suit = card.suit.toLowerCase();
  var rank = card.rank.toLowerCase();
  var fontSize = cardSizes[clazz] != undefined? cardSizes[clazz]: 1.2;

  if(back) {
    return `<div class="card back card_in_pile" style='font-size: ${fontSize}em'>*</div>`;
  }
  if(suit == "atouts") {
    var $rank = rank == "t0" ? "" : rank.substring(1);
    return `<${type} class="card tarot ${rank} ${clazz}" style='font-size: ${fontSize}em'>
                <span class="rank">${$rank}</span>
            </${type}>`
  }
  return `<${type} class="card rank-${card.rank.toLowerCase()} ${card.suit} ${clazz}" style='font-size: ${fontSize}em'>
            <span class="rank">${translate(card.rank)}</span>
            <span class="suit">&${card.suit};</span>
          </${type}>`
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
        forEach(configs, function (value, prop, obj) {
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
  ${createBooleanOption("cavaliers", translate("Include cavaliers"), "56 "+translate("cards"), "52 "+translate("cards"))}
  <br />
  ${createBooleanOption("atouts", translate("Include atouts cards"), getDeckSize()+" "+translate("cards"), getDeckSize()+" "+translate("cards"))}
  <br />
  ${createNumberOption("hidden_card_aside", "Hidden cards aside", defaultHiddenCards())}
  <br />
  ${createBooleanOption("tricks", translate("Claim tricks 🂠")+" <b> X </b>", translate("tricks won"), translate("cards in hand"))}
  <br />
  ${createBooleanOption("turn", translate("Turn change"), translate("turn change each round"), translate("turn order stay the same"))}
  <br />
  ${createBooleanOption("all_cards", translate("All cards"), translate("Distribute all cards"), translate("Distribute a specific number"))}
  <br />
  ${createBooleanOption("block_action", translate("Block actions"), translate("Only the player whose turn can do things"), translate("Action can be done by anyone at any moment"))}
  <br />
  ${createBooleanOption("block_get_cards", translate("Block cards taken"), translate("Prevent to take cards from playing area"), translate("Cards can be taken from playing area"))}
  <br />
  ${createBooleanOption("end_turn_draw", translate("End turn after playing"), translate("Play a card to end turn"), translate("You have to specifically end you turn"))}
  <br />
  ${createBooleanOption("stack_visible", translate("View all cards"), translate("View all cards played"), translate("View only the last one"))} 
  <br />
  ${createBooleanOption("preparation", translate("Preparation phase"), translate("Moment to exchange or put card aside before playing"), translate("Players play directly after distribution"))} 
  <br />
  ${createBooleanOption("inverse_pile", 
                        translate("Inverse discard pile display"), 
                        translate("The last card played is the first display (can't pile up cards)"), 
                        translate("The last card played in the last display (can pile up cards)"))} 
  <br />
  ${createNumberOption("number_decks", "decks of cards", 1)}
  `;
}

function defaultHiddenCards(){
  if(options.atouts && options.cavaliers) {
    return players.length < 5 ? 6 : 3;
  } else {
    return 0;
  }
}

function getDeckSize() {
  var cardsNumber = 52;
  if(options.cavaliers) {
    cardsNumber += 4;
  }
  if(options.atouts) {
    cardsNumber += 22;
  }
  return cardsNumber
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

function drawDeckDistribute() {
  var content = "";
  var message = players.length == 1
        ? translate("Your are the only player connected! ")
        : translate("Card to distribute to each player ") +`( ${players.length} ${translate("players")})`;
  content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} ${translate("cards")}</h2><br>`;

  var message = players.length == 1 ? translate("Your are the only player connected!") : `${players.length} ${translate("players")}`;

  content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} ${translate("cards")}</h2><br>`;

  if (!isSpectatorOrGuest() && (!options.block_action || isMyTurn())) {
    content += `
    ${createButton("Shuffle cards", "shuffleDeck()")} </br>
    ${createButton("Distribute", "distributeCards()")} </br>
    <div class="control-group form-inline">`
      if (!options.all_cards) {
        content+= `<label class="mb-2" for="distribute_card">${translate("Card to distribute to each player ")} ( ${message} )</label>
        <input  class= "mb-2 w-100" type = "number" id = "distribute_card" min="1" max="${Math.floor(deckOriginalLength/players.length)}" placeholder = "${translate("number of cards")}"
                  value="${options["cards_distribute"]}"} />`
      }
    content += `</div>`
  }

  if (options.block_action && !isMyTurn()) {
    content += createMessage("Wait for the dealer to give you cards", "info");
  }

  content += "</div>"
    
  if (cardAside != -1) {
    content += `<div class = 'col-6 playingCards faceImages'> ${drawCard(cardAside, "card_aside", "span")}</div>`;
  } else if(!options.all_cards && (!options.block_action || isMyTurn())){
    content += `
      <div class = 'col-6 playingCards'>
        ${drawStack()}
        ${createButton("Put a card aside", "putCardAside()", "margin_top")}
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
  broadcastUpdate({action: actions.READY_TO_PLAY, state: states.PLAYING})
}

function getDiscardPile(){
  emitToServer(actions.GET_DISCARD_PILE);
}

function drawStack() {
  var cardsContent = "";
  for (i = 0; i < 4; i ++ ) {
    cardsContent += `<li><div class="card back deck_stack_card">*</div></li>`
  }
  return `<ul class="deck_stack deck">${cardsContent}</ul>`;
}

function drawDeckPreparation() {
  var content = "";

  if (remainingCards == 0) {
    content = `<div class = 'col-6'><h2>${translate("Deck is empty")}</h2><br>`
  } else {
    content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} cards</h2><br>`
  }
  content += `${createButton("Get back cards", "askResetRound()")} </br>`;
  content += `${createButton("Ready to play", "readyToPlay()")} </br>`;
  content += "</div>"

  if (remainingCards == 0) {
    content += `<div class = 'col-6'><span class="card_deck">∅</span></div>`;
  } else {
    content += `<div class = 'col-6 playingCards faceImages'>`;

    if(cardAside != -1) {
      content += drawCard(cardAside, "card_aside", "span");
    }
    else {
      content += drawStack();
    }

    content += createButton("Draw a card", "takeCard()", "margin_top")
    content += "</div>";
  }     
  return content;
}

function drawDeckPlay() {
  var content = "";

  if (remainingCards == 0) {
    content = `<div class = 'col-6'><h2>${translate("Deck is empty")}</h2><br>`
  } else {
    content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} cards</h2><br>`
  }
  if (!options.block_action || isMyTurn()) {
    content += `${createButton("Get back cards", "askResetRound()")} </br>`;
  }
  if(!isMyTurn()) {
    content += `${createMessage("Wait for your turn!", "info")}`;
  } else if(!options.end_turn_draw) {
    content += `${createButton("End turn", "endTurn()")} </br>`;
  } else {
    content += `${createMessage("This is your turn!", "success")}`
  }
  if(isGuest()){
    content += `<div class="alert alert-info" role="alert">${translate("Wait to be add to the game")}</div>`;
  } else if (isSpectator()) {
    content += `<div class="alert alert-warning" role="alert">${translate("Refresh to go on guest list")}</div>`;
  }
  content += "</div>"

  if (remainingCards == 0 && cardAside == -1) {
    content += `<div class = 'col-6'><span class="card_deck">∅</span></div>`;
  } else {
    content += `<div class = 'col-6 playingCards faceImages'>`;

    if(cardAside != -1) {
      content += drawCard(cardAside, "card_aside", "span");
    }
    else {
      content += drawStack();
    }

    if (!options.block_action || isMyTurn()) {
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
  canDisplayTricks(state)
  switch(state) {
    case states.CONFIGURATION: {
      $("#game_controls").invisible();
      $("#sideArea").empty();
      deckContent = drawDeckConfig();
      playContent = drawPileConfig();
      $("#playArea").append(playContent);
      break;
    }
    case states.DISTRIBUTION: {
      $("#game_controls").visible();
      deckContent = drawDeckDistribute();
      drawPile();
      break;
    }
    case states.PREPARATION: {
      $("#game_controls").visible();
      deckContent = drawDeckPreparation();
      drawPile();
      break;
    }
    case states.PLAYING: {
      $("#game_controls").visible();
      deckContent = drawDeckPlay();
      drawPile();
      break;
    }
  }
  $("#mainDeck").append(deckContent);
  changeCardColor()
}

function canDisplayTricks(state) {
  if(state != states.CONFIGURATION 
    && options.tricks  ) {
    $("#show_tricks").visible()
  } else {
    $("#show_tricks").invisible()
  }
}

function drawHand(instruction = false) {
  $("#your_hand").empty();

  if(isSpectatorOrGuest()) { 
    var message = createSpectatorModeMessage();
    $("#your_hand").append(message);
    return;
  }

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

function drawPile() {
  if(state == states.CONFIGURATION) {
    return
  }
  $("#playArea").empty();
  var content = `
      <h2>${translate("Playing Area (discard pile)")}</h2>
      <div class = "col-10 form-group">
        ${createBooleanOption("end_turn_draw", translate("End turn after playing"))} <br>
        ${createBooleanOption("back_card", translate("Hide card value"))} <br>
      </div>`;

  if (options.tricks) {
    if (state == states.PLAYING && pile.length == players.length) {
      content += createButton("Claim trick", "claimTrick()", "margin_bottom");
    }
  } else if(pile.length != 0 || cardsCleared != 0) {
      content += createButton("Get back and shuffle discard pile", "getDiscardPile()", "margin_bottom");
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
    if (!options.stack_visible || card.pile_up) {
      $layer.draggable({ containment: "parent" });
      $layer.css({ position: "absolute" });
    }
    $("#playArea").append($layer);
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
  my_hand.sort(function (a, b) {
    if(options.atouts) {
      if (SUITS_ATOUTS.indexOf(a.suit) < SUITS_ATOUTS.indexOf(b.suit)) return -1;
      if (SUITS_ATOUTS.indexOf(a.suit) > SUITS_ATOUTS.indexOf(b.suit)) return 1;

      if(a.suit == "atouts" && b.suit == "atouts") {
        return ATOUTS.indexOf(a.rank) - ATOUTS.indexOf(b.rank);
      }
      else {
        return RANK_ATOUTS.indexOf(a.rank) - RANK_ATOUTS.indexOf(b.rank);
      }
    } else {
      if (SUITS.indexOf(a.suit) < SUITS.indexOf(b.suit)) return -1;
      if (SUITS.indexOf(a.suit) > SUITS.indexOf(b.suit)) return 1;

      return RANK.indexOf(a.rank) - RANK.indexOf(b.rank);
    }

  });
  drawHand();
}

function sortCardByValue() {
  my_hand.sort(function (a, b) {
    return RANK.indexOf(a.rank) - RANK.indexOf(b.rank);
  });
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
  emitToServer(actions.DISTRIBUTE, { 
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
  return user != -1 && user.status == user_status.GUEST;
}

function isSpectator(user=my_user) {
  return user == -1;
}

function isPlayer(user=my_user) {
  return user != -1 && user.status != user_status.GUEST;
}

function isOwner(user=my_user) {
  return user != -1 && user.status == user_status.OWNER;
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
        case states.DISTRIBUTION : distributeCards(); break;
        case states.PLAYING: {
          if(!options.end_turn_draw) {
            endTurn();
          }
          break;
        }
      }
    }
});