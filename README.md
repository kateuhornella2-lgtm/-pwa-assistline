# AssistLine — démo PWA d'une hotline support client

Petit projet pédagogique pour démontrer le fonctionnement d'une PWA (Progressive Web App) à travers un cas d'usage concret : une hotline de support client (SAV).

## Fonctionnalités PWA démontrées

- **Installable** : `manifest.json` + Service Worker permettent d'installer l'app (bouton "Installer l'app" ou menu du navigateur).
- **Fonctionnement hors-ligne** : `sw.js` met en cache l'app shell (HTML/CSS/JS/icônes) ; l'interface reste utilisable sans réseau, avec une page `offline.html` en secours.
- **File d'attente + synchro automatique** : un ticket créé hors-ligne est stocké dans `localStorage` avec le statut "En attente de réseau", puis marqué "Synchronisé" automatiquement dès que l'événement `online` se déclenche.
- **Notifications** : bouton "Simuler une réponse d'agent" utilisant l'API Notification / `ServiceWorkerRegistration.showNotification`.
- **Statut réseau en direct** : badge En ligne / Hors-ligne basé sur `navigator.onLine` et les événements `online`/`offline`.

## Lancer le projet

Un Service Worker nécessite un contexte sécurisé (`https://` ou `localhost`) — on ne peut pas l'ouvrir en `file://`. Depuis le dossier du projet :

```bash
# Avec Python
python -m http.server 8080

# Ou avec Node (npx)
npx serve .
```

Puis ouvrez `http://localhost:8080` dans le navigateur (Chrome/Edge recommandés pour tester l'installation).

Vous pouvez aussi utiliser l'extension VS Code "Live Server".

## Comment tester chaque fonctionnalité

1. **Installation** : ouvrez l'app, cliquez sur "Installer l'app" en haut à droite (ou icône d'installation dans la barre d'adresse).
2. **Hors-ligne** : DevTools → onglet *Network* → cochez *Offline*. Rechargez : l'app reste fonctionnelle. Le badge passe à "Hors-ligne".
3. **File d'attente** : toujours hors-ligne, créez un ticket dans "Nouveau ticket" → il apparaît "En attente de réseau" dans "Mes tickets". Repassez en ligne (décochez *Offline*) : le ticket passe automatiquement à "Synchronisé".
4. **Notifications** : onglet "Contact" → "Simuler une réponse d'agent" → autorisez les notifications si demandé.
5. **Cache** : DevTools → *Application* → *Service Workers* / *Cache Storage* pour inspecter le cache `assistline-v1`.

## Structure du projet

```
index.html          Interface principale (SPA à onglets)
offline.html         Page de secours hors-ligne
manifest.json         Manifest PWA (nom, icônes, couleurs, mode standalone)
sw.js                 Service Worker (cache app shell, stratégie réseau/cache)
css/style.css         Styles
js/app.js             Logique : SW, onglets, tickets, notifications, install prompt
icons/                Icônes SVG (standard + maskable)
```
