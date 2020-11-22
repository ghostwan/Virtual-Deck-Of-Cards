
// Put to false for production // before pushing
const DEBUG = false


const CARD = {
    KIT: "kit",
    CAT: "cat",
    NOPE: "nope",
    EXPLODING: "exploding",
    TARGETED_ATTACK: "targeted-attack"
}

const DECK_TYPE = {
    ORIGINAL: "original",
    IMPLODING: "imploding"
}
// Without kit and exploding which are dynamic
const ORIGINAL_DECK = {
  nope: 5,
  attack: 4,
  favor: 4,
  shuffle: 4,
  skip: 4,
  "see-the-future": 5,
  "beard-cat": {number: 4, type: CARD.CAT},
  "cattermelon": {number: 4, type: CARD.CAT},
  "hairy-potato-cat": {number: 4, type: CARD.CAT},
  "rainbow-ralphing-cat": {number: 4, type: CARD.CAT},
  "tacocat": {number: 4, type: CARD.CAT}
};
const ORIGINAL_DECK_SIZE = 46;
const EXTRA_KITS = 3;


const IMPLODING_DECK = {
    // imploding: 1,
    reverse: 4,
    "draw-from-the-bottom": 4,
    // "alter-the-future": 4,
    // "feral-cat": 4,
    "targeted-attack": 3,
}


const HELP_TEXT = "Mouse hover on a card to know its rule (or click here)";
const SIDE_NAV_WIDTH = 700


const CARDS_ACTION = {
    "shuffle" : "shuffleDeck",
    "kit" : "putCardInDeck",
    "exploding" : "userLost",
    "see-the-future": {func: "revealMode", param: true},
    "draw-from-the-bottom": {func: "takeCard", param:false},
    "favor": {func: "exchangeMode", param:true},
    "reverse": "reverseTurnOrder"
}

const EMOJIS = ['😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔',
    '😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖',
    '😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑',
    '👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀',
    '😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩'];

const STATES = {
    CONFIGURATION : "configuration",
    DISTRIBUTION: "distribution",
    PLAYING: "playing",
    REVEAL: "reveal"
}

const USER_STATUS = {
    OWNER: "owner",
    GUEST: "guest",
    PLAYER: "player"
}

const ACTIONS = {

    /* Connection actions */
    CONNECT_ROOM: "connect room",
    RECONNECT_ROOM: "reconnect room",
    DISCONNECT: "disconnect", // socket io event
    ASK_USER_INFO: "ask info",
    SEND_USER_INFO: "send info",
    USER_CONNECTED: "user connected",
    USER_RECONNECTION_FAILED: "user reconnection failed",
    EXPULSE_USER : "expulse user",
    ACCEPT_USER: "accept user",
    REMOVE_USER: "remove user",

    /* Data sync actions */
    BROADCAST_UPDATE: "broadcast update",
    UPDATE_DATA: "update data",
    UPDATE_OPTION: "update option",
    UPDATE_HAND: "update hand",
    HAND_CHANGE: "hand change",
    LOG_ACTION: "log action",

    /* Game actions */
    RESET_GAME: "reset the game",
    RESET_ROUND: "reset the round",
    READY_TO_PLAY: "ready to play",
    REVERSE: "reverse",
    END_TURN: "end turn",    

    /* Deck Actions */
    DISTRIBUTE: "distribute",
    SHUFFLE_DECK: "shuffle the deck",
    PUT_CARD_ASIDE: "put a card aside",
    TAKE_CARD_ASIDE: "take card aside",
    REMOVE_CARD_ASIDE: "remove card aside",
    REVEAL_DECK_CARDS: "reveal deck cards",
    
    /* Hand actions */
    PLAY_CARD: "play a card",
    DRAW_CARD: "draw a card",
    PLAY_ALL_CARDS: "play all cards",
    TAKE_BACK_CARD: "take back a card",
    TAKE_BACK_ALL_CARDS: "take back all cards",
    SORT_VALUE: "sort card by value",
    SHUFFLE_HAND: "shuffle hand",

    /* Discard Pile */
    PUT_CARD_PILE: "put card on pile",
    PUT_ALL_CARDS_PILE: "put alls cards on pile",
    PUT_DISCARD_CARDS_PILE: "put discard cards on pile",
    CLAIM_TRICK: "claim trick",
    GET_DISCARD_PILE:"get discard pile",
    CLEAR_AREA: "clear the playing area",
    PILE_UP_AREA: "pile up the playing area",
    DISPERSE_AREA: "disperse the playing area",
    GIVE_CARD_PILE: "give card to pile",
    PUT_BACK_CARD_DECK: "put back a card on the deck",

    /* Players action */
    CHANGE_TURN: "change turn",
    RANDOM_FIRST_PLAYER: "choose first player randomly",
    REVEAL_PLAYERS_CARDS: "reveal players cards",
    REFRESH_BOARD: "refresh board",
    
    /* Other actions */
    INCREASE_SIZE: "increase size",
    DECREASE_SIZE: "decrease size",
}

const CONFIGS = {
    exploding : { 
        cards_distribute: 7,
        tricks: false,
        cavaliers: false,
        at_least_one_kit:true,
        turn: false,
        all_cards: false,
        block_get_cards: false,
        block_action: false,
        end_turn_play: false,
        stack_visible: true,
        visio: false,
        extention_imploding: true,
    },
}

const CCOLORS = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
};