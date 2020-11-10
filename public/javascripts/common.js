const CARDS_IN_DECK = [
    // "kit1", "kit2", "kit3", "kit4", "kit5", "kit6", // Those cards a generated depending on player number 
    // "exploding1", "exploding2", "exploding3", "exploding4" // Those cards a generated depending on player number 
    "nope1", "nope2", "nope3", "nope4", "nope5",
    "attack1", "attack2", "attack3", "attack4",
    "favor1", "favor2", "favor3", "favor4",
    "shuffle1", "shuffle2", "shuffle3", "shuffle4",
    "skip1", "skip2", "skip3", "skip4",
    "see-the-future1", "see-the-future2", "see-the-future3", "see-the-future4", "see-the-future5",
    "beard-cat1", "beard-cat2", "beard-cat3", "beard-cat4",
    "cattermelon1", "cattermelon2", "cattermelon3", "cattermelon4",
    "hairy-potato-cat1", "hairy-potato-cat2", "hairy-potato-cat3", "hairy-potato-cat4",
    "rainbow-ralphing-cat1", "rainbow-ralphing-cat2", "rainbow-ralphing-cat3", "rainbow-ralphing-cat4",
    "tacocat1", "tacocat2", "tacocat3", "tacocat4"
]

const CAT_CARDS = ["beard-cat", "cattermelon", "hairy-potato-cat", "rainbow-ralphing-cat", "tacocat" ]
const HELP_TEXT = "Mouse hover on a card to know its rule (or click here)";

const CARD = {
    KIT: "kit",
    CAT: "cat",
    NOPE: "nope"
}

const EXTRA_KITS = 3;

const CARDS_ACTION = {
    "shuffle" : "shuffleDeck",
    "kit" : "putCardInDeck",
    "exploding" : "userLost",
    "see-the-future": {func: "revealMode", param: true},
    "favor": {func: "exchangeMode", param:true}
}

const EMOJIS = ['😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔',
    '😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖',
    '😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑',
    '👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀',
    '😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩'];

const states = {
    CONFIGURATION : "configuration",
    DISTRIBUTION: "distribution",
    PLAYING: "playing",
    REVEAL: "reveal"
}

const user_status = {
    OWNER: "owner",
    GUEST: "guest",
    PLAYER: "player"
}

const actions = {

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

const configs = {
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
    },
}

