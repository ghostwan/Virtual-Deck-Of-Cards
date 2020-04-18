// import i18next from 'i18next';
// import Backend from 'i18next-http-backend';

const emojis = ['😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔',
    '😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖',
    '😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑',
    '👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀',
    '😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩'];

const suit = ["clubs", "diams", "spades", "hearts"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "C", "Q", "K"];

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
var room;
var translate;

function main(roomName) {

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
    // If we are in action blocked mode and it's not my turn do nothing
    if (options.block_action && !isMyTurn()) {
      return;
    }

    var cardIndex = $(".card_in_hand").index($(this));
    var card = my_hand[cardIndex];
    console.log("Click on your card on " + card);

    my_hand.splice(cardIndex, 1);
    $(".card_in_hand:eq(" + cardIndex + ")").remove();
    card["username"] = my_user.name;
    pile.push(card);

    gameData[my_user.id].cards --
    updateData({ what: "play a card", pile: pile, gameData: gameData })
    drawHand();
    if(options.next_turn) {
      endTurn();
    }
  });

  // Move card from the pile to your hand
  $("body").on("click", ".card_in_pile", function () {
    // Take card from pile disable
    if(options.block_get_cards) {
      return;
    }

    // Game disconnected
    if(socket.id == undefined) {
      return;
    }

    // If we are in action blocked mode and it's not my turn do nothing
    if (options.block_action && !isMyTurn()) {
      return;
    }

    takeCardFromPile(this);
  });


  $("#option_reorder").change(function () {
    drawHand();
  });

  room = roomName

  i18next.use(i18nextXHRBackend ).use(i18nextBrowserLanguageDetector)
    .init({
    ns: ['game'],
    defaultNS: 'game',
    nonExplicitWhitelist : true,
    debug: true,
    }, (err, t) => {
      translate = t
      socket.emit("connectRoom", roomName);  
      init()
    });
}

function reconnect() {
  socket.connect();
  socket.emit("reconnectToRoom", room, my_user);  
}

socket.on('disconnect', function(){
  $("#mainDeck").empty();
  $content = `
    <div class="row w-100">
        <div class="col-8 form-group">
          <h2 class="start_text">${translate("You are disconnected!")}</h2>
          <br /><br />
          <button onclick = 'reconnect()' class = 'btn btn-outline-dark btn-lg btn-block'>${translate("Reconnect")}</button><br>
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
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
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


socket.on("onUpdateLog", function (log) {
  $("#logMessage").text(log);
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

socket.on("onUpdateData", function (data) {
  console.log(">>>>> New data broadcast >>>>>");
  console.log(data);
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
});

function updateOption(name, value) {
  // Game disconnected
  if(socket.id == undefined) {
    return;
  }
  options[name] = value;
  var data = {what: "update options", options: options}
  socket.emit("updateData", data);
}

function updateData(data) {
  // Game disconnected
  if(socket.id == undefined) {
    return;
  }
  socket.emit("updateData", data);
}

function onOptionMenu(name, options) {
  switch(name) {
    case "turn": {
      const userid = options.$trigger.attr("userid");
      updateData({ what: "switch turn", playerNumber: getUserPlace(userid) })
    }; break;
    case "clear" : clearPlayingArea(); break;
    case "take" : takeCardFromPile(options.$trigger); break;
  }
  
}

function takeCardFromPile(item) {
  var cardIndex = $(".card_in_pile").index($(item));
  var cardIndex = options["stack_visible"] ? pile.length - 1 - cardIndex : cardIndex;
  var card = pile[cardIndex];
  console.log("Click on the pile card on " + card);

  my_hand.push(card);
  pile.splice(cardIndex, 1);

  gameData[my_user.id].cards ++
  updateData({ what: "take back a card", pile: pile, gameData: gameData })
  drawHand();
}

function start() {
  syncOption("cavaliers")
  syncOption("tricks")
  syncOption("turn")
  syncOption("all_cards")
  syncOption("block_action")
  syncOption("block_get_cards")
  syncOption("next_turn")
  options["cards_distribute"] = 1;
  options["stack_visible"] = true;

  updateData({ what: "update options", options: options })
  resetRound();
}

function clearPlayingArea() {
  if (confirm(translate("Are you sure, you want to clear the playing area?"))) {
    updateData({ what: "clear the playing area", pile: [] })
  }
}

function init() {
  $.contextMenu({
    selector: '.user_profil_menu', 
    callback: function(key, options) {
      onOptionMenu(key, options);
    },
    items: {
        "turn": {name: translate("Set turn"), icon: "fa-hand-paper"},
    }
  });
  $.contextMenu({
    selector: '#playArea', 
    callback: function(key, options) {
        onOptionMenu(key, options);
    },
    items: {
        "clear": {name: translate("Clear"), icon: "fa-trash-alt"},
    }
  });
  $.contextMenu({
    selector: '.card_in_pile', 
    callback: function(key, options) {
        onOptionMenu(key, options);
    },
    items: {
        "take": {name: translate("Take"), icon: "fa-hand-lizard"},
    }
  });
  $("#reset_button").text(translate("Reset"))
  $("#sort_button").text(translate("Sort"))
  $("#instruction").append(translate("instruction"))
  $('#option_reorder').bootstrapToggle({
    off: translate("Play"),
    on: translate("Reorder")
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
  if (confirm(translate("Are you sure you won the trick?"))) {
    if(gameData[my_user.id] == undefined) {
      gameData[my_user.id] = {}
    }
    if(gameData[my_user.id].tricks == undefined) {
      gameData[my_user.id].tricks = []
    }
    gameData[my_user.id].tricks.push(pile);
    updateData({ what: "claim tricks", gameData: gameData, pile: [], playerNumber: getUserPlace() })
  }
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

function drawTricks(userid=my_user.id) {
  $("#tricksArea").empty()
  var tricks = getTricks(userid);
  $content = ''
  if(tricks != undefined) {
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
  $("#tricksArea").append($content);
}

function drawUsersInfos() {
  $("#user_container").empty();
  users.forEach((user) => {
    var number = "";
    var data = gameData[user.id];
    if(state == STATE_CONFIG) {
      number = `🂠 <b> X </b>`
    } else if(data != undefined) {
      if(options.tricks) {
        if(data != undefined && data.tricks != undefined)
          number = " 🂠 <b>" + data.tricks.length + "</b>";
      } else if (data != undefined && data.cards != undefined) {
        number = " 🂠 <b>" + data.cards + "</b>";
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
    if(state != STATE_CONFIG) {
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
  return options[name] == undefined ? true : options[name];
}

function drawCard(card, clazz, type="div") {
  return `<${type} class="card rank-${card.rank.toLowerCase()} ${card.suit} ${clazz}">
            <span class="rank">${card.rank}</span>
            <span class="suit">&${card.suit};</span>
          </${type}>`
}


function addOption(name, title, descriptionChecked, description) {
  return `
  <input type="checkbox" class="form-check-input" 
    id="option_${name}" onclick = 'onOptionChange("${name}")' ${isChecked(name)? "checked" : ""}/>
  <label class="form-check-label option_label" for="option_${name}" >${title}
  => ${isChecked(name)? descriptionChecked : description}
  </label>
  `
}

function syncOption(name) {
  options[name] = $("#option_"+name).is(":checked");
}

function drawDeckConfig() {
  return `
      <div class="row w-100">
        <div class="col-6 form-group">
          <h2 class="start_text">${translate("Room")} ${room} ${translate("Everyone in?")}</h2>
          <br />
          <button class="btn btn-outline-dark btn-lg btn-block get_deck" onclick="start()">${translate("Start")}</button>
        </div>
        <div class="col-6 h-100 container " id="optionList">
          <div class="col h-100">
            ${addOption("cavaliers", translate("Include cavaliers"), translate("56 cards"), translate("52 cards"))}
            <br />
            ${addOption("tricks", translate("Claim tricks 🂠")+" <b> X </b>", translate("tricks won"), translate("cards in hand"))}
            <br />
            ${addOption("turn", translate("Turn change"), translate("turn change each round"), translate("turn order stay the same"))}
            <br />
            ${addOption("all_cards", translate("All cards"), translate("Distribute all cards"), translate("Distribute a specific number"))}
            <br />
            ${addOption("block_action", translate("Block actions"), translate("Only the player whose turn can do things"), translate("Action can be done by anyone at any moment"))}
            <br />
            ${addOption("block_get_cards", translate("Block cards taken"), translate("Prevent to take cards from playing area"), translate("Cards can be taken from playing area"))}
            <br />
            ${addOption("next_turn", translate("End turn after playing"), translate("Play a card to end turn"), translate("You have to specifically end you turn"))}
        </div>
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

  if (!options.block_action || isMyTurn()) {
    content += `
    <button onclick = 'shuffleDeck()' class = 'btn btn-outline-dark btn-lg btn-block'>${translate("Shuffle cards")}</button><br>
    <button class = 'btn btn-outline-dark btn-lg btn-block' onclick = 'distributeCards()'>${translate("Distribute")}</button><br>
    <div class="control-group form-inline">`
      if (!options.all_cards) {
        content+= `<label class="mb-2" for="distribute_card">${message}</label>
        <input  class= "mb-2" type = "number" id = "distribute_card" placeholder = "${translate("number of cards")}"
                  onchange="updateOption('cards_distribute', this.value)"  value="${options["cards_distribute"]}"} />`
      }
    content += `</div></div>`
  }

  if (options.block_action && !isMyTurn()) {
    content += translate("Wait for the dealer to give you cards!")
  }
    
  if (cardAside != -1) {
    content += `<div class = 'col-6 playingCards faceImages'> ${drawCard(cardAside, "card_aside", "span")}</div>`;
  } else if(!options.all_cards && (!options.block_action || isMyTurn())){
    content += `
      <div class = 'col-6'>
        <span class="card_deck">🂠</span>
        <button style="margin-left:25%" class='col-6 distrib-btn btn btn-primary ' onclick = 'putCardAside()'>${translate("Put a card aside")}</button>
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

function drawDeckPlay() {
  var content = "";

  if (remainingCards == 0) {
    content = `<div class = 'col-6'><h2>${translate("Deck is empty")}</h2><br>`
  } else {
    content = `<div class = 'col-6'><h2>${translate("Deck")}: ${remainingCards} / ${deckOriginalLength} cards</h2><br>`
  }
  if (!options.block_action || isMyTurn()) {
    content += `
    <button onclick = 'askResetRound()' class = 'btn btn-outline-dark btn-lg btn-block'>
      ${translate("Get back cards")}
    </button><br>`;
  }
  if(!isMyTurn()) {
    content += `
      <div class="alert alert-warning" role="alert">
        ${translate("Wait for your turn!")}
      </div>
    `;
  } else if(!options.next_turn) {
    content += `
      <button onclick = 'endTurn()' class = 'btn btn-outline-dark btn-lg btn-block'>
        ${translate("End turn")}
      </button><br>`
  } else {
    content += `
    <div class="alert alert-success" role="alert">
      ${translate("This is your turn!")}
    </div>
    `
  }

  content += "</div>"
  if (remainingCards == 0) {
    content += `
    <div class = 'col-6'><span class="card_deck">∅</span></div>`;
  } else {
    content += `
      <div class = 'col-6 playingCards faceImages'>
        ${cardAside != -1 ? drawCard(cardAside, "card_aside", "span") : '<span class="card_deck">🂠</span>'}`;

    if (!options.block_action || isMyTurn()) {
      content += `<button style="margin-left:25%" class='col-6 distrib-btn btn btn-primary ' onclick = 'takeCard()'>${translate("Draw a card")}</button>`;
    }
    content += "</div>";
  }     
  return content;
}

function drawDeck() {
  $("#mainDeck").empty();
  var content = "";
  switch(state) {
    case STATE_CONFIG: {
      $("#reset_button").invisible();
      $("#playArea").empty();
      $("#tricksArea").empty();
      content = drawDeckConfig();
      break;
    }
    case STATE_DISTRIBUTE: {
      $("#reset_button").visible();
      content = drawDeckDistribute();
      break;
    }
    case STATE_PLAY: {
      $("#reset_button").visible();
      content = drawDeckPlay();
      break;
    }
  }
  $("#mainDeck").append(content);
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

function drawPile() {
  if(state == STATE_CONFIG) {
    return
  }

  $("#playArea").empty();
  var content = `
      <h2>${translate("Playing Area")}</h2>
      <div class = "col-6 form-group">
        <input type='checkbox' class='form-check-input' id='option_stack_visible' onclick = 'onOptionChange("stack_visible")' 
        ${isChecked("stack_visible") ? "checked" : ""} />
        <label class="form-check-label" for="option_stack_visible">${translate("View all cards")}</label>
      </div>`;

  if (options.tricks) {
    if (pile.length == users.length) {
      content += `<button class = "playing_btn btn btn-outline-dark btn-lg btn-block" onclick = "askClaimTrick()">${translate("Claim trick")}</button>`;
    }
  } else {
    content += `<button class = "playing_btn btn btn-outline-dark btn-lg btn-block" onclick = "clearPlayingArea()">${translate("Clear")}</button>`;
  }
  $("#playArea").append(content);

  for (var i = 0; i < pile.length; i++) {
    var j = options["stack_visible"] ? pile.length - 1 - i : i;
    card = pile[j];
    var $item = $(drawCard(card, "card_in_pile"))
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

function sortCard() {
  my_hand.sort(function (a, b) {
    if (suit.indexOf(a.suit) < suit.indexOf(b.suit)) return -1;
    if (suit.indexOf(a.suit) > suit.indexOf(b.suit)) return 1;

    return ranks.indexOf(a.rank) - ranks.indexOf(b.rank);
  });
  drawHand();
}

function distributeCards() {
  var numCards = $("#distribute_card").val();
  if (options.all_cards) {
    numCards = -1;
  }
  data = { numCards: numCards, hand: my_hand };
  socket.emit("distribute", data);
}

function onOptionChange(name) {
  updateOption(name, $("#option_" + name).is(":checked"));
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
        case STATE_DISTRIBUTE: distributeCards(); break;
        case STATE_PLAY: {
          if(!options.next_turn) {
            endTurn();
          }
          break;
        }
      }
    }
});