var state;
var cardAside = -1;
var users = [];
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

function main(roomName, lang) {

  // Move card from your hand to the pile
  $("body").on("click", ".card_in_hand", function () {
    // Game disconnected
    if(socket.id == undefined) {
      return;
    }

    // If reorder possible do nothing
    if ($("#option_reorder").prop("checked")) {
      return;
    }

    // If we are playing and in action blocked mode and it's not my turn do nothing
    if (state == states.PLAY 
      && options.block_action 
      && !isMyTurn()) {
      return;
    }

    putCardOnPile(this)
    // If we are playing and if there is to end the turn on draw, end the turn
    if(state == states.PLAY && options.end_turn_draw) {
      endTurn();
    }
    
  });

  // Move card from the pile to your hand
  $("body").on("click", ".card_in_pile", function () {
    // Game disconnected
    if(socket.id == undefined) {
      return;
    }
    
    // If we are playing abd take card from pile is disabled
    if(state == states.PLAY && options.block_get_cards) {
      return;
    }

    // If we are playing and in action blocked mode and it's not my turn do nothing
    if (state == states.PLAY 
      && options.block_action 
      && !isMyTurn()) {
      return;
    }

    takeCardFromPile(this);
  });


  $("#option_reorder").change(function () {
    drawHand();
  });

  $("#colors_option").change(function () {
    changeCardColor();
  });

  $("body").on("click", ".dropdown-item", function (e) {
    console.log("click")
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
      socket.emit("connectRoom", roomName);  
      init()
    });
}

function createMessage(message, type="primary") {
  return `<div class="alert alert-${type}" role="alert">
            ${translate(message)}
          </div>`;
}

function createButton(title, jsAction, clazz="") {
  return `<button onclick = '${jsAction}' class = 'btn btn-outline-dark btn-lg btn-block ${clazz}'>
            ${translate(title)}
          </button>`;
};

function reconnect() {
  socket.connect();
  socket.emit("reconnectToRoom", room, my_user);  
}

socket.on("onReconnectionFailed", function() {
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

socket.on('disconnect', function(){
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

socket.on("askInfo", function () {
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
  socket.emit("sendInfo", my_user);
});

socket.on("onUpdateHand", function (data) {
  console.log("===== Update Hand =====");
  console.log(data);
  my_hand = data;
  drawHand();
});


socket.on("onNewAction", function (who, what) {
  if(what != actions.END_TURN) {
    $("#logMessage").text(`${who} ${translate(what)}`);
  }
});

function isExist(value) {
  return value != undefined
}

function isMyTurn() {
  if(playerNumber != -1 && users[playerNumber] != undefined)  {
    return users[playerNumber].id == my_user.id;
  }
  return false;
}

socket.on("onRevealCards", function (data) {
  console.log("=====> Data in clear")
  console.log(data)
  drawPileRevealCards(data);
});

socket.on("onUpdateData", function (data) {
  console.log(">>>>> New data broadcast >>>>>");
  console.log(data);
  var reDrawHand = false;
  var reDrawPile = false;
  var reDrawDeck = false;
  var reDrawUsersInfo = false;
  var reDrawTricks = false;
  var action = data.action


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
  }

  if (reDrawDeck) drawDeck();
  if (reDrawHand) drawHand(data.instruction == true);
  if (reDrawPile) drawPile();
  if (reDrawUsersInfo) drawUsersInfos();
  if (reDrawTricks) drawTricks();
  // if (reDrawPlayersHand) drawPlayerHands();
  playAction(action);
});

function updateOptions() {
  // Game disconnected
  if(socket.id == undefined) {
    return;
  }
  var data = {action: actions.UPDATE_OPTION, options: options}
  socket.emit("updateData", data);
}

function updateData(data) {
  // Game disconnected
  if(socket.id == undefined) {
    return;
  }
  socket.emit("updateData", data);
}


function takeCardAside() {
  my_hand.push(cardAside);
  cardAside = -1;
  gameData[my_user.id].cards = my_hand
  updateData({ action: actions.TAKE_CARD_ASIDE, cardAside: cardAside, gameData: gameData })
  drawHand();
}

function removeCardAside() {
  cardAside = -1;
  updateData({ action: actions.REMOVE_CARD_ASIDE, cardAside: cardAside })
}

function takeCardFromPile(item=undefined) {
  var action;
  if(item != undefined) {
    action = actions.TAKE_BACK_CARD;
    var cardIndex = $(".card_in_pile").index($(item));
    var cardIndex = options.stack_visible ? pile.length - 1 - cardIndex : cardIndex;
    var card = pile[cardIndex];
  
    my_hand.push(card);
    pile.splice(cardIndex, 1);
  
    gameData[my_user.id].cards = my_hand
  } else {
    action = actions.TAKE_BACK_ALL_CARDS;
    for (c = 0; c < pile.length; c++) {
      var card = pile[c];
      my_hand.push(card);
      
      gameData[my_user.id].cards = my_hand
    }
    pile = [];
  }
  updateData({ action: action, pile: pile, gameData: gameData })
  drawHand();
}

function putCardOnPile(item=undefined) {
  var action;
  if(item != undefined) {
    action = actions.PLAY_CARD;

    var cardIndex = $(".card_in_hand").index($(item));
    var card = my_hand[cardIndex];

    my_hand.splice(cardIndex, 1);
    $(".card_in_hand:eq(" + cardIndex + ")").remove();
    card["username"] = my_user.name;
    pile.push(card);

    gameData[my_user.id].cards = my_hand
  } else {
    action = actions.PLAY_ALL_CARDS;
    for (c = 0; c < my_hand.length; c++) {
      var card = my_hand[c];
      $(".card_in_hand:eq(" + cardIndex + ")").remove();
      card["username"] = my_user.name;
      pile.push(card);

    }
    my_hand = [];
    gameData[my_user.id].cards = my_hand
  }

  updateData({ action: action, pile: pile, gameData: gameData })
  drawHand();
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
    updateData({ action: actions.CLEAR_AREA, pile: [] })
  }
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
    [actions.RANDOM_FIRST_PLAYER]: {name: translate("choose randomly"), icon: "fa-hand-paper"},
    [actions.REVEAL_PLAYERS_CARDS]: {name: translate(actions.REVEAL_PLAYERS_CARDS), icon: "fa-hand-paper"}
  });
  createMenu(".user_profil_menu", {
    [actions.CHANGE_TURN]: {name: translate("your turn"), icon: "fa-hand-paper"},
  });
  createMenu(".card_in_pile", {
    [actions.TAKE_BACK_CARD]: {name: translate("take this card"), icon: "fa-hand-lizard"},
    [actions.TAKE_BACK_ALL_CARDS]: {name: translate(actions.TAKE_BACK_ALL_CARDS), icon: "fa-hand-lizard", visible: function(key, opt){return options.exchange;}},
    [actions.CLEAR_AREA]: {name: translate("clear"), icon: "fa-trash-alt"}
  });
  createMenu(".card_in_hand", {
    [actions.PLAY_ALL_CARDS]: {name: translate(actions.PLAY_ALL_CARDS), icon: "fa-hand-lizard", visible: function(key, opt){return options.exchange;}},
    [actions.SHUFFLE_HAND]: {name: translate("shuffle"), icon: "fa-hand-lizard"},
  });
  createMenu(".card_aside", {
    [actions.TAKE_CARD_ASIDE]: {name: translate("take this card"), icon: "fa-hand-lizard"},
    [actions.REMOVE_CARD_ASIDE]: {name: translate("remove"), icon: "fa-hand-lizard"},
  });
  

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

function onOptionMenu(name, op) {
  switch(name) {
    case actions.CHANGE_TURN: {
      const userid = op.$trigger.attr("userid");
      const num = getUserPlace(userid)
      if(options.turn) {
        options.turn = num+2;
      }
      updateData({ action: name,  playerNumber:  num, options: options })
    }; break;
    case actions.RANDOM_FIRST_PLAYER: {
      const num = Math.floor(Math.random() * users.length);
      if(options.turn) {
        options.turn = num+2;
      }
      updateData({ action: name,  playerNumber: num, options: options  })
    }; break;
    case actions.REVEAL_PLAYERS_CARDS: {
      if (confirm(translate("Are you sure, you want to reveal to everyone players cards?"))) {
        socket.emit("revealCards");
      }
    }; break;
    case actions.CLEAR_AREA : clearPlayingArea(); break;
    case actions.TAKE_BACK_CARD : takeCardFromPile(op.$trigger); break;
    case actions.TAKE_CARD_ASIDE : takeCardAside(); break;
    case actions.REMOVE_CARD_ASIDE : removeCardAside(); break;
    case actions.TAKE_BACK_ALL_CARDS : takeCardFromPile(); break;
    case actions.PLAY_ALL_CARDS : putCardOnPile(); break;
    case actions.SHUFFLE_HAND : shuffleCard(); break;
  }
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
    socket.emit("resetGame");
  }
}

function getUserPlace(userID=my_user.id){
  for (var u = 0; u < users.length; u++) {
    if(users[u].id == userID) {
      return u;
    }
  }
}

function getTricks(userid=my_user.id) {
  if(gameData[userid] != undefined) {
    return gameData[userid].tricks;
  }
}

function askClaimTrick() {
  if(gameData[my_user.id] == undefined) {
    gameData[my_user.id] = {}
  }
  if(gameData[my_user.id].tricks == undefined) {
    gameData[my_user.id].tricks = []
  }
  gameData[my_user.id].tricks.push(pile);
  updateData({ action: actions.CLAIM_TRICK, gameData: gameData, pile: [], playerNumber: getUserPlace() })
}

function playAction(action) {
  console.log("Action: "+action);

  if ($("#card_sound_option").prop("checked")) {
    switch(action) {
      case actions.SHUFFLE_DECK: playSound("shuffle"); break;
      case actions.CARD_ASIDE: playSound("turn_card"); break;
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
  socket.emit("shuffleDeck");
}

function resetRound() {
  socket.emit("resetRound");
}

function takeCard() {
  var data = { hand: my_hand };
  socket.emit("takeCard", data);
}

function putCardAside() {
  socket.emit("putCardAside");
}

function endTurn() {
  if(isMyTurn()) {
    socket.emit("endTurn");
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

function drawTricks(userid=my_user.id) {
  $("#sideArea").empty()
  var tricks = getTricks(userid);
  var $content = ''
  if(tricks != undefined) {
    $("#sideArea").append(`<h4>${translate("Tricks")}</h4>`)
    for (var t = 0; t < tricks.length; t++) {
      var trick = tricks[t];
      $content += `<ul class='hand tricks'>`;
      for (var c = 0; c < trick.length; c++) {
        var card = trick[c];
        $content += `<li>${drawCard(card, "test", "a")}</li>`;
      }
      $content += `</ul>`;
    }
  }
  $("#sideArea").append($content);
}

function drawUsersInfos() {
  $("#user_container").empty();
  users.forEach((user) => {
    var number = "";
    var data = gameData[user.id];
    if(state == states.CONFIGURE) {
      number = `🂠 <b> X </b>`
    } else if(data != undefined) {
      if(options.tricks) {
        if(data != undefined && data.tricks != undefined)
          number = " 🂠 <b>" + data.tricks.length + "</b>";
      } else if (data != undefined && data.cards != undefined) {
        number = " 🂠 <b>" + data.cards.length + "</b>";
      }
    }
    var userClass = "user_profil"
    if(playerNumber != -1 
      && user != undefined 
      && users != undefined
      && users[playerNumber] != undefined
      && users[playerNumber].id == user.id) {
      userClass +=  " player"
    }
    if(state != states.CONFIGURE) {
      userClass += " user_profil_menu"
    }
    var content = `
          <div class="${userClass}" userid=${user.id}>
            <p class="user_emoji">${user.emoji}</p>
            <p>${user.name}${number}</p>
          </div>
      `;
    $("#user_container").append(content);
  });

  $(".player_number").text(translate("Players") + users.length);
}

function isChecked(name) {
  return options[name] == undefined ? false : options[name];
}

function drawCard(card, clazz, type="div") {
  return `<${type} class="card rank-${card.rank.toLowerCase()} ${card.suit} ${clazz}">
            <span class="rank">${translate(card.rank)}</span>
            <span class="suit">&${card.suit};</span>
          </${type}>`
}


function createBooleanOption(name, title, descriptionChecked=undefined, description=undefined) {
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

function createNumberOption(name, title) {
  numberOptionList[name] = 1;
  return `<input  class= "mb-2" type = "number" 
    id = "option_${name}" min="1" value="1"} />
    <label class="form-check-label option_label" for="option_${name}" >${translate(title)}`
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
  ${createBooleanOption("cavaliers", translate("Include cavaliers"), translate("56 cards"), translate("52 cards"))}
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
  ${createBooleanOption("exchange", translate("Need to exchange card"), translate("Moment to exchange before playing"), translate("Play after distribution"))} 
  <br />
  ${createNumberOption("number_decks", "decks of cards")}
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

function drawDeckDistribute() {
  var content = "";
  var message = users.length == 1
        ? translate("Your are the only player connected! ")
        : translate("Card to distribute to each player ") +`( ${users.length} ${translate("players")})`;
  content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} ${translate("cards")}</h2><br>`;

  var message = users.length == 1 ? translate("Your are the only player connected!") : `${users.length} ${translate("players")}`;

  content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} ${translate("cards")}</h2><br>`;

  if (!options.block_action || isMyTurn()) {
    content += `
    ${createButton("Shuffle cards", "shuffleDeck()")} </br>
    ${createButton("Distribute", "distributeCards()")} </br>
    <div class="control-group form-inline">`
      if (!options.all_cards) {
        content+= `<label class="mb-2" for="distribute_card">${translate("Card to distribute to each player ")} ( ${message} )</label>
        <input  class= "mb-2 w-100" type = "number" id = "distribute_card" min="1" max="${deckOriginalLength}" placeholder = "${translate("number of cards")}"
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
  updateData({action: actions.READY_TO_PLAY, state: states.PLAY})
}

function drawStack() {
  var cardsContent = "";
  for (i = 0; i < 4; i ++ ) {
    cardsContent += `<li><div class="card back deck_stack_card">*</div></li>`
  }
  return `<ul class="deck_stack deck">${cardsContent}</ul>`;
}

function drawDeckExchange() {
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
  switch(state) {
    case states.CONFIGURE: {
      $("#game_controls").invisible();
      $("#sideArea").empty();
      deckContent = drawDeckConfig();
      playContent = drawPileConfig();
      $("#playArea").append(playContent);
      break;
    }
    case states.DISTRIBUTE: {
      $("#game_controls").visible();
      deckContent = drawDeckDistribute();
      drawPile();
      break;
    }
    case states.EXCHANGE: {
      $("#game_controls").visible();
      deckContent = drawDeckExchange();
      drawPile();
      break;
    }
    case states.PLAY: {
      $("#game_controls").visible();
      deckContent = drawDeckPlay();
      drawPile();
      break;
    }
  }
  $("#mainDeck").append(deckContent);
  changeCardColor()
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
  return `
      <h2> ${translate("Game options")} </h2>
      ${createGameConfigs()}
      <div id="option_list" class="col h-100">
      ${drawOptionList()}
    </div>
  `;
}

function drawPile() {
  if(state == states.CONFIGURE) {
    return
  }

  $("#playArea").empty();
  var content = `
      <h2>${translate("Playing Area")}</h2>
      <div class = "col-10 form-group">
        ${createBooleanOption("end_turn_draw", translate("End turn after playing"))} <br>
        ${createBooleanOption("back_card", translate("Hide card value"))} <br>
      </div>`;

  if (options.tricks) {
    if (pile.length == users.length) {
      content += createButton("Claim trick", "askClaimTrick()", "margin_bottom");
    }
  } else {
    // content += createButton("Clear", "clearPlayingArea()", "margin_bottom");
  }
  $("#playArea").append(content);

  for (var i = 0; i < pile.length; i++) {
    var j = options["stack_visible"] ? pile.length - 1 - i : i;
    card = pile[j];
    var $item = ""
    if (options.back_card) {
      $item = `<div class="card back card_in_pile">*</div>`;
    } else {
      $item = $(drawCard(card, "card_in_pile"));
    }
    var $layer = $('<div class="card_layer"/>');
    var $owner = $('<div class="card_owner"/>').text(card["username"]);
    $layer.append($item);
    $layer.append($owner);
    if (!options["stack_visible"]) {
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

function drawPileRevealCards(gameData) {
  $("#playArea").empty()
  $("#playArea").append(`<h2>${translate("Players cards")}</h2>`)
  var $content = ''
  forEach(gameData, function (value, prop, obj) {
    if(value.cards && !value.user_disconnected) {
      var user = getUser(prop);
      if(user) {
        $content += `<p>${user.name}</p>`;
      }
      if (value.cards.length == 0) {
        $content += `<span class="empty_pile">∅</span>`;
      } else {
        $content += `<ul class='hand tricks'>`;
        value.cards.forEach(card => {
          $content += `<li>${drawCard(card, "test", "a")}</li>`;
        });
        $content += `</ul>`;
      }
    }
  });
  $("#playArea").append($content);
}

function sortCard() {
  my_hand.sort(function (a, b) {
    if (SUITS.indexOf(a.suit) < SUITS.indexOf(b.suit)) return -1;
    if (SUITS.indexOf(a.suit) > SUITS.indexOf(b.suit)) return 1;

    return RANK_CAVLIERS.indexOf(a.rank) - RANK_CAVLIERS.indexOf(b.rank);
  });
  drawHand();
}

function shuffleCard() {
  my_hand = shuffle(my_hand);
  drawHand()
}

function distributeCards() {
  syncNumberOption("cards_distribute")
  
  var numCards = $("#distribute_card").val();
  if (options.all_cards) {
    numCards = -1;
  }
  data = { numCards: numCards, hand: my_hand };
  socket.emit("distribute", data);
}

function onOptionChange(name) {
  options[name] = $("#option_" + name).is(":checked");
  updateOptions();
}

function debug(object) {
  console.log("=== DEBUG ===");
  console.log(object);
  console.log("=============");
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
        case states.DISTRIBUTE : distributeCards(); break;
        case states.PLAY: {
          if(!options.end_turn_draw) {
            endTurn();
          }
          break;
        }
      }
    }
});