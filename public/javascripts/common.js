const RANK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "C", "Q", "K", "A"];
const RANK_ATOUTS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "C", "Q", "K"] 
const ATOUTS = ["T0", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8" , "T9" , "T10" , "T11", "T12", "T13", "T14", "T15", "T16", "T17", "T18", "T19", "T20", "T21" ] 

const SUITS = ["clubs", "diams", "spades", "hearts"];
const SUITS_ATOUTS = ["clubs", "diams", "spades", "hearts", "atouts"];

const EMOJIS = ['😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔',
    '😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖',
    '😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑',
    '👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀',
    '😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩'];

const states = {
    CONFIGURATION : "configuration",
    PREPARATION: "preparation",
    DISTRIBUTION: "distribution",
    PLAYING: "playing"
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
    CLAIM_TRICK: "claim trick",
    GET_DISCARD_PILE:"get discard pile",
    CLEAR_AREA: "clear the playing area",
    PILE_UP_AREA: "pile up the playing area",
    DISPERSE_AREA: "disperse the playing area",
    GIVE_CARD_PILE: "give card to pile",

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
    escalier : { 
        tricks: true,
        cards_distribute: 2,
        cavaliers: true,
        turn: true,
        all_cards: false,
        block_get_cards: true,
        block_action: true,
        end_turn_draw: true,
        stack_visible: true,
    },
    ratatouille : { 
        tricks: true,
        cards_distribute: -1,
        cavaliers: true,
        turn: false,
        all_cards: true,
        block_get_cards: true,
        block_action: true,
        end_turn_draw: true,
        stack_visible: true,
        preparation: true
    }, 
    yaniv : { 
        tricks: false,
        cards_distribute: 4,
        cavaliers: true,
        turn: false,
        all_cards: false,
        block_get_cards: false,
        block_action: true,
        end_turn_draw: false,
        stack_visible: true
    },
    tarot : { 
        tricks: true,
        cards_distribute: -1,
        cavaliers: true,
        atouts: true,
        turn: false,
        all_cards: true,
        block_get_cards: true,
        block_action: true,
        end_turn_draw: true,
        stack_visible: true,
        preparation: true
    },
    poker: {
        cards_distribute: 2,
        stack_visible: true,
        tricks: false,
        end_turn_draw:false,
        block_get_cards: true,
    }

}