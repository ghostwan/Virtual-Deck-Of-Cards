# Virtual Deck Of Cards
![alt text](icon.png)

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
- Share the room url to invite people into the game!
- See who's connected to the room
- Choose your name roger!
- Configure deck, game style, cavaliers...
- Put a card aside for game as "oh hell"
- Distribute the whole deck or a specific number of cards among all players 
- Draw a card from the deck
- Play a card from your hand
- Take a card from the playing area (for some game as yaniv or if you did a mistake)
- Claim the trick if you won the round
- Rearange cards in your hand or sort them
- See who play a card
- Clear the playing area

# What's next 

- UI - Passer les checkbox en toggle
- UI - Utiliser le CSS pour draw les cartes
- GAME PLAY - Ordre du tour
- GAME PLAY - YANIV - Voir le nombre de cartes dans la main des gens
- GAME PLAY - YANIV - loguer les actions des gens voir qui a piocher 
- GAME PLAY - YANIV - regrouper les cartes en haut de pile 
- GAME PLAY - YANIV -  permettre de nettoyer les cartes poser par le joueur d'avant
- GAME PLAY - RATATOUILLE - Affichage des plies remportés
- GAME PLAY - ESCALIER - Prise en compte des annonces
- GAME PLAY - MARMOTEE - poser des cartes cacher sur la table
- GAME PLAY - Quand quelqu'un se connecte lui permettre ou non de rejoindre la partie, sinon spectateur
- GAME PLAY - Locker la partie pour que plus personnes ne puisse rentrer 
- GAME PLAY - Gestion des scores
- GAME PLAY - Preset de configuration pour des jeux existants
- GAME PLAY - TAROTS - Rajouter les cartes les atouts de tarot
- GAME PLAY - Sélectionner le nombre de deck quand on est nombreux
- GAME PLAY - Créer de nouvelles cartes entre 10 et valet quand on est plusieurs (11, 12, 13, 14, 15...)
- UX - Chat écrit
- UX - Chat oral / video

# Bugs

- Si on distribue plus de cartes que de personnes ça foire les comptes  


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