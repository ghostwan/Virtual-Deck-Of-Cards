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

# What next ?

- GAME PLAY - Gestion des plies
- GAME PLAY - Ordre du tour
- GAME PLAY - Prise en compte des annonces
- GAME PLAY - Locker la partie pour que plus personnes ne puisse rentrer
- GAME PLAY - Mettre une carte de coté pour les jeux comme l'Escalier
- GAME PLAY - Pour la yaniv permettre de nettoyer les cartes poser par le joueur d'avant
- GAME PLAY - Gestion des scores
- UI - Passer les checkbox en toggle

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