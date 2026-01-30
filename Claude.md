Game jam
theme : masque

IDEE

On est un mineur pour du pétrole dans une entreprise qui cherche à gagner des contract pour s'améliorer
Chaque niveau est un contrat de forage
chaque niveau contient différentes couches qu'il faut miner
à chaque couche il y a un ou plusieurs élément chimique, augmente avec le temps
Masque pour se protéger des éléments chimiques qu'on trouve en creusant dans le sol
Chaque contrat est généré de manière aléatoire en fonction de la reconnaissance et des options que le joueur a

GAMELOOP
choisir un contract
voir l'entièreté de la couche du contrat

Commencer à miner
- x temps pour miner la couche actuelle
- on affiche un bout de la prochaine couche
- le joueur doit changer de masque si nécessaire
- si mauvais masque, 1 de dégat (3 vies)
  si on a plus de vie on perd ce contrat et on perd de la thune (peut être perdre en reconnaissance et donc ne pas pouvoir faire de plus gros contracts)
  si on a plus assez de thune pour commencer un contract on a définitivement perdu


UPGRADE dans le jeu RECONNAISSANCE
systeme de reconnaissance 1 2 3
permet d'atteindre des contrat plus gros

power up pour
augmenter la taille de sa tete pour porter plusieurs masques
augmenter la vitesse de minage (attention on ne peut pas revenir en arrière)
augmenter la profondeur à laquelle le détecteur est juste
augmenter sa vie
augmenter sa regen (sur x couches)

# Tech
vue 3 + pinia
phaser 3 

