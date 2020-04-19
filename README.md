# Virtual Deck Of Cards
![alt text](public/images/icon.png)

A virtual deck of cards! Play anything anywhere, with anyone!

You are a fan of cards game as :
- [Yaniv](https://www.wikiwand.com/en/Yaniv_(card_game))
- [Ascenseur](https://www.wikiwand.com/en/Oh_Hell)
- Escalier
- [Barbu](https://www.wikiwand.com/en/Barbu_(card_game))
- Ratatouille
...

Covid-19 is here, you are lockdown at home and want to play remotely with your friends ?

Fear no more, as the virtual deck of cards is here! Simply create or sign into a deck, and play any game with anyone.

# What you can currently do
- Create a room to play any cards game with your friends!
- Share the room's url to invite people into the game!
- See who's connected to the room
- Choose your name roger!
- Configure deck, game style...
- Put a card aside for game as "oh hell"
- Distribute the whole deck or a specific number of cards among all players 
- See How many cards each player got
- See who's turn is
- Change turn order
- Draw a card from the deck
- Play a card from your hand
- Take a card from the playing area (for some game as Yaniv or if you did a mistake)
- In trick mode, claim the trick if you won the round, count tricks and display yours
- Rearrange cards in your hand or sort them
- See who played a card
- Clear the playing area
- Block players actions when it's not there turn
- Language available (browser detection): default english, french.

# What's new 

- Reconnection mechanisum when socket is disconnected but server is not down
- Add log message
- Fix on small screen
- Prevent to get card from playing area
- Add option to end turn after playing a card
- Put Ace a the end when ordering
- Add 4 colors option

# What's next 

- Permettre de lancer un server local accessible auxà l'exterieur (https://www.pluralsight.com/guides/exposing-your-local-node-js-app-to-the-world)
- Sonnerie dès que c'est a son tour
- carte déjà classé dès distribué
- Donner des cartes et piocher des cartes
- UI - grossir / reduire taille cartes 
- GAME PLAY - ESCALIER - Prise en compte des annonces
- GAME PLAY - MARMOTEE - poser des cartes cacher sur la table
- GAME PLAY - Quand quelqu'un se connecte lui permettre ou non de rejoindre la partie, sinon spectateur
- GAME PLAY - Locker la partie pour que plus personnes ne puisse rentrer 
- GAME PLAY - Gestion des scores
- GAME PLAY - Preset de configuration pour des jeux existants
- GAME PLAY - Sélectionner le nombre de deck quand on est nombreux
- GAME PLAY - TAROTS - Rajouter les cartes les atouts de tarot
- GAME PLAY - Créer de nouvelles cartes entre 10 et valet quand on est plusieurs (11, 12, 13, 14, 15...)
- UX - Chat écrit
- UX - Chat oral / video
- UI - Revoir l'ecran d'appel

## Manque pour Yaniv 
- GAME PLAY - YANIV - Mettre une carte depuis la pioche dans la zone de jeu
- GAME PLAY - YANIV - regrouper les anciennes cartes (cartes jouer par le joueur avant)
- GAME PLAY - YANIV - Mélanger la déffausse
- GAME PLAY - YANIV - Retourner une carte pour la priocher la 1er fois
  

# Bugs

- Si on distribue plus de cartes que de personnes ça foire les comptes
- Server se met en down au bout d'une heure

# Game features status

| Features / Games                      | Escalier [D] | Ratatouille [D] | Yaniv  [N] | Tarot   [T] |
| ------------------------------------- | ------------ | --------------- | ---------- | ----------- |
| Distribute all the deck               |              | OK              |            | OK          |
| Distribute a specific number of cards | OK           |                 | OK         |             |
| Put a card aside                      | OK (atout)   |                 |            |             |
| Claim trick                           | OK           | OK              |            | OK          |
| See How many cards each player got    |              |                 | OK         |             |
| Draw a card from the deck             |              |                 | OK         |             |
| Take a card from the playing area     |              |                 | OK         |             |
| Change turn automatically             | OK           |                 |            |             |
| Display trick won                     |              | OK              |            | OK          |
| Log actions                           |              |                 | OK         |             |
| ------------ TO DEVELOP ------------  |              |                 |            |             |
| Trump cards (atouts)                  |              |                 |            | **NEED**    |
| Group old cards played                |              |                 | OPTIM      |             |
| Random first player                   | OPTIONNAL    | OPTIONNAL       | OPTIONNAL  |             |
| Bidding                               | OPTIONNAL    |                 |            |             |
| Scores calculator                     | OPTIONNAL    | OPTIONNAL       | OPTIONNAL  | OPTIONNAL   |
| Recall the round rules                |              | OPTIONNAL       |            |             |


D = DONE: you can play easily to this game  
N = NOT OPTIMAL: you can play but it's not optimal features are missing  
W = WIP:  you can't currently play important features are missing  
T = TODO: Most of the minimum need feature are missing  
 
 ---

# How to play locally

### 1)  Install Node JS 

Follow for your platform instruction [here](https://nodejs.org/en/download/package-manager)

### 2) Clone repository

in a console:

> git clone https://github.com/ghostwan/Virtual-Deck-Of-Cards.git

### 3) Start node package 

in a console:
- go to where you cloned the virtual deck

> npm start

### 4) Open a navigator

> http://localhost:3000/

Fro other computer on the local network use computer IP

# How to deploy remotely

## Use Heroku

Heroku is a platform as a service (PaaS) that enables developers to build, run, and operate applications entirely in the cloud. 
It as a free plan enough for this app needs.

https://www.heroku.com/

### 1) Install CLI

Follow for your platform instruction [here](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up)

### 2) Get Heroku logs

> heroku logs -t -a project_name

### 3) Deploy the app

https://devcenter.heroku.com/articles/getting-started-with-nodejs#deploy-the-app

---

# Credits

## Cards in CSS

Fork of https://github.com/selfthinker/CSS-Playing-Cards

@author Anika Henke anika@selfthinker.org
@license CC BY-SA [http://creativecommons.org/licenses/by-sa/3.0]
@version 2011-06-14
@link http://selfthinker.github.com/CSS-Playing-Cards/