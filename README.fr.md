# FilterVideo

Extension web qui détecte les vidéos et permet d'appliquer un filtre (flou/opacité) à l'aide d'un raccourci clavier personnalisable.

## Fonctionnalités

- Filtres vidéo avec raccourci clavier personnalisable :
  - Filtre flou avec intensité réglable (1-100 %)
  - Filtre d'opacité avec niveau réglable (1-100 %)
- Application automatique des filtres à la détection de vidéos (optionnel)
- Prise en charge de plusieurs plateformes :
  - YouTube
  - Netflix
  - Amazon Prime Video
  - Disney Plus
  - Autres plateformes via détection des iframes
- Commutateur global pour activer/désactiver
- Paramètres persistants entre les sessions du navigateur

## Installation

### Pour Chrome

#### Depuis le Chrome Web Store

1. Rendez-vous sur la [page FilterVideo du Chrome Web Store](https://chromewebstore.google.com/detail/filtervideo/gchjhchmcjnphmbkmllgfalidiakaoea)
2. Lisez la description et les avis
3. Cliquez sur "Ajouter à Chrome" si l'extension vous intéresse ou si vous souhaitez l'essayer

#### Depuis le code source

1. Clonez ce dépôt
2. Ouvrez Chrome et accédez à `chrome://extensions`
3. Activez le "mode développeur"
4. Cliquez sur "Charger l’extension non empaquetée" et sélectionnez le répertoire `src`

### Pour Firefox

#### Depuis les modules complémentaires de Firefox

1. Rendez-vous sur la [page FilterVideo des modules complémentaires Firefox](https://addons.mozilla.org/en-US/firefox/addon/filtervideo/)
2. Lisez la description et les avis
3. Cliquez sur "Ajouter à Firefox" si l'extension vous intéresse ou si vous souhaitez l'essayer

#### Depuis le code source

1. Clonez ce dépôt
2. Exécutez `mv firefox/manifest.json src/manifest.json`
3. Ouvrez Firefox et accédez à `about:debugging`
4. Cliquez sur "Ce Firefox"
5. Cliquez sur "Charger un module complémentaire temporaire"
6. Sélectionnez le répertoire `src`

## Utilisation

1. Cliquez sur l'icône FilterVideo dans la barre d'outils de votre navigateur
2. Utilisez l'interrupteur pour activer/désactiver l'extension
3. Choisissez votre raccourci clavier préféré
   - Par défaut : ',' (recommandé car proche de 'm' pour le mute)
4. Réglez l'intensité du filtre à l'aide du curseur
5. Appuyez sur le raccourci clavier en regardant une vidéo pour activer/désactiver le filtre

### Comportement spécifique aux plateformes

#### Plateformes principales (YouTube, Netflix, Prime Video, Disney Plus)

- Fonctionnalité complète avec raccourcis clavier fonctionnant partout
- Les filtres peuvent être activés/désactivés facilement
- Option d'application automatique des filtres disponible

#### Autres plateformes (détection des iframes)

Important : En raison de la sécurité cross-origin, certaines limitations s'appliquent :

- Les raccourcis clavier ne fonctionnent que lorsque le focus est en dehors de la vidéo
- Pour une utilisation efficace :
  1. Zoomez la page si nécessaire (geste à deux doigts), mais ne passez pas en plein écran
  2. Cliquez juste en dehors de la vidéo pour que le raccourci fonctionne
  3. Envisagez d'utiliser un raccourci près du bouton mute de votre appareil. Par exemple, '-' est proche du bouton mute sur Mac.

Option "Filtrage automatique à la détection" dans les paramètres :

- Les vidéos seront automatiquement filtrées lorsqu'elles sont détectées
- Vous pourrez ensuite activer/désactiver le filtre manuellement à l'aide du raccourci

## Dépannage

### Le raccourci ne fonctionne pas

1. Vérifiez si l'extension est activée
2. Essayez de rafraîchir la page
3. Si la plateforme utilise un iframe, cliquez en dehors de l'iframe, puis appuyez sur le raccourci

### Vidéo non détectée

1. Rafraîchissez la page
2. Désactivez puis réactivez l'extension
3. Rechargez l'extension depuis chrome://extensions

### Développement

1. Installez les dépendances :

   ```bash
   npm install
   ```

2. Exécutez les tests :

   ```bash
   npm run test
   ```

3. Construisez pour la production :

   ```bash
   npm run package
   ```

 Cela créera une version prête pour la production dans le répertoire dist ainsi qu'un fichier ZIP prêt pour le Chrome Web Store.

-> Pour Firefox, vous devez exécuter 'mv firefox/manifest.json src/manifest.json' avant d'exécuter la même commande.

## Contributions

Les contributions sont les bienvenues ! N'hésitez pas à soumettre une Pull Request.

## Confidentialité et permissions

L'extension nécessite des permissions minimales :

- `tabs` : Pour la détection des vidéos
- `webNavigation` : Pour suivre les changements d'URL
- `storage` : Pour sauvegarder les préférences
- `alarms` : Pour garantir un fonctionnement cohérent

Nous ne :

- Collectons aucune donnée utilisateur
- Effectuons aucune requête réseau externe
- Traitions aucun contenu vidéo

## Support

- Email : [elamine.beng@gmail.com](mailto:elamine.beng@gmail.com)
- Problèmes : [GitHub Issues](https://github.com/bengmoh/filter-video/issues)
- Retours : [Formulaire de feedback](https://forms.gle/muGcKNufR2XzAnVV9)
- Source : [Dépôt GitHub](https://github.com/bengmoh/filter-video)


## Traduction

* [العربية](./README.ar.md)
* [English](./README.md)
* [Français](./README.fr.md)