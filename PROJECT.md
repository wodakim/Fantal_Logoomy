# Project VERMILION: Technical Design Document

**Note:** Ce document est la "Bible" du projet. Chaque formule, chaque constante et chaque mécanique décrite ici doit être implémentée scrupuleusement.

## Module 1: Core Engine & Isometric Architecture

### 1.1. Philosophie du Moteur (The "Zodiac" Engine)
Le cœur du jeu repose sur une simulation pseudo-3D rendue en 2D (2.5D), écrite en Vanilla ES6 JavaScript. L'objectif est de reproduire le "feel" exact de la grille Final Fantasy Tactics (mouvement case par case, gestion de la hauteur, rotation de caméra à 90°) tout en intégrant des fluides dynamiques (sang).

**Stack Technique (STRICT VANILLA & MOBILE FIRST) :**
* **No Build System :** ZÉRO bundler (pas de Vite/Webpack/NPM). Utilisation native de ES6 Modules (`<script type="module">`). Le jeu doit tourner directement depuis `index.html`.
* **Rendering :** HTML5 Canvas API (Context 2D) pour les performances brutes (60fps).
* **UI Layer :** DOM HTML/CSS pour les menus vectoriels nets. Mobile First (Touch Targets > 44px).
* **State Management :** Typed Arrays pour la gestion mémoire sans Garbage Collection.
* **Inputs :** Mobile First. Tap (Move/Select), Double Tap (Confirm), Long Press (Info).

### 1.2. Mathématiques de Projection Isométrique
La conversion de l'espace logique (x, y, z) vers l'espace écran (sx, sy) est fondamentale.

**Constantes de la Grille :**
* `TILE_WIDTH`: 64px
* `TILE_HEIGHT`: 32px (Ratio 2:1 standard isométrique)
* `HEIGHT_SCALE`: 16px (1 unité de hauteur h = 16 pixels verticaux)

**Formules de Projection :**
Pour projeter un point P(x, y, z) :
```javascript
const TILE_W = 64;
const TILE_H = 32;
const H_SCALE = 16;

function isoToScreen(x, y, z, camX, camY) {
    return {
        x: (x - y) * (TILE_W / 2) + camX,
        y: (x + y) * (TILE_H / 2) - (z * H_SCALE) + camY
    };
}

// Inverse pour le Mouse Picking (Raycasting simplifié sur plan Z=0)
function screenToIso(sx, sy, camX, camY) {
    let adjX = sx - camX;
    let adjY = sy - camY;
    // Approximation sans Z, nécessite itération sur les hauteurs pour précision
    return {
        x: Math.floor((adjY / (TILE_H/2) + adjX / (TILE_W/2)) / 2),
        y: Math.floor((adjY / (TILE_H/2) - adjX / (TILE_W/2)) / 2)
    };
}
```

### 1.3. Structure de Données de la Carte (Chunk System)
Pour gérer la génération procédurale et les fluides, la carte n'est pas un tableau d'objets, mais une collection de `Uint8Array` (Structure of Arrays).

**Structure Mémoire d'un Chunk (16x16) :**
```javascript
class Chunk {
    constructor(size = 16) {
        this.size = size;
        this.area = size * size;

        // Géométrie
        this.heightMap = new Int8Array(this.area);   // Hauteur du sol (z)
        this.typeMap = new Uint8Array(this.area);    // 0:Vide, 1:Pierre, 2:Eau, 3:Lave
        this.wallMap = new Uint8Array(this.area);    // Bitmask pour murs (N, S, E, W)

        // Game State (Dynamique)
        this.liquidLevel = new Uint8Array(this.area); // 0-10: Niveau de sang/eau
        this.unitIndex = new Int16Array(this.area);   // -1: Vide, 0-N: ID de l'unité
        this.objIndex = new Int16Array(this.area);    // ID décor/cadavre
    }

    getIndex(x, y) {
        return y * this.size + x;
    }
}
```

### 1.4. Algorithme de Rendu (Painter's Algorithm)
Pour simuler la profondeur sans Z-Buffer 3D, l'ordre de dessin est critique.

**Ordre de boucle :**
 * On dessine du fond vers l'avant (Back-to-Front).
 * Boucle Y (0 \rightarrow Max)
 * Boucle X (0 \rightarrow Max)
 * À chaque coordonnée (x, y), on dessine :
   * Le bloc de terrain (hauteur z).
   * L'objet ou l'unité posé dessus.
   * Les effets de particules (sang, fumée) triés par z.

**Code de Rendu (Concept) :**
```javascript
function renderLoop(ctx, chunk) {
    for (let y = 0; y < chunk.size; y++) {
        for (let x = 0; x < chunk.size; x++) {
            let i = chunk.getIndex(x, y);
            let z = chunk.heightMap[i];

            // 1. Dessiner la colonne de terrain
            drawTerrainColumn(ctx, x, y, z, chunk.typeMap[i]);

            // 2. Dessiner le liquide (Sang)
            if (chunk.liquidLevel[i] > 0) {
                drawFluid(ctx, x, y, z, chunk.liquidLevel[i]);
            }

            // 3. Dessiner Unité/Objet
            let unitId = chunk.unitIndex[i];
            if (unitId !== -1) {
                let unit = unitList[unitId];
                // Offset Y pour animation de saut/flotter
                drawSprite(ctx, unit.sprite, x, y, z + unit.jumpOffset);
            }
        }
    }
}
```

### 1.5. Le Moteur Temporel (The Clocktick System)
Le système "Active Time Battle" (ATB) modifié. Contrairement à un tour par tour strict, le temps est une ressource fluide.
**Mathématiques du CT (Charge Time) :**
* Chaque entité possède une variable CT (0 à 100) et une stat Speed (ex: 6 à 15).
* L'unité agit quand CT \geq 100.
* Le "Tick" global du jeu s'arrête dès qu'une unité dépasse 100, permettant au joueur de choisir une action.
**Gestion de la Priorité :**
* Si plusieurs unités dépassent 100 au même tick, on favorise l'unité la plus rapide.

### 1.6. The Fluid Engine (Phase 1.5 - Prioritaire)
Le sang n'est pas un décor, c'est une mécanique physique.
* **Simulation :** Cellular Automata sur la grille.
* **États :**
    * **Liquid :** Se propage vers le bas (z) et les côtés. Fait glisser (Move Cost +).
    * **Dried :** Devient solide après X tours.
    * **Coagulated :** Bloque le passage.
* **Rendu :** Particules de pixels (pas de carrés unis).

### 1.7. Système de "Juice" & Caméra
Pour moderniser le rendu FFT classique, la caméra réagit aux événements mathématiques.
 * **Impact Shake :** CamOffset = \sin(t) \times Damage_{amount} \times 0.5
 * **Zoom Dynamique :** Lors de l'exécution d'une compétence, zoom in (Scale \rightarrow 1.5) centré sur la cible (TargetX, TargetY).
 * **Rotation :** Matrice de rotation simple de 90°. `NewY = -OldX` (Nécessite de re-trier le tableau de rendu).

---

## Module 2: Procedural Generation & "Noise" Architecture

### 2.1. L'Algorithme "Flesh-Carver" (Topologie du Terrain)
La génération de cartes ne doit pas être totalement aléatoire (chaos), mais tactiquement cohérente. Nous utilisons un bruit de Perlin quantifié pour créer des élévations naturelles (collines) combiné à des "Coupures Voronoi" pour simuler des fractures artificielles ou des blessures dans la chair du monde.
**Formule de Hauteur (Height Map) :**
Pour chaque case (x, y), la hauteur h est calculée via une superposition d'octaves de bruit :
 * **Quantification (Step) :** Contrairement à un terrain lisse, FFT nécessite des marches. Nous arrondissons chaque valeur à l'entier le plus proche (ou 0.5 unité).
 * **Amplitude (A_i) :** Détermine la verticalité (MaxHeight = 16 pour des falaises mortelles).

**Implémentation JS (Noise Wrapper) :**
```javascript
function generateTerrain(seed) {
    const map = new Int8Array(256); // 16*16
    const frequency = 0.15;
    const amplitude = 6; // Hauteur max ~6 blocs

    for (let y = 0; y < 16; y++) {
        for (let x = 16; x < 16; x++) {
            // Bruit 2D (Simplex ou Perlin)
            let n = noise2D(x * frequency, y * frequency, seed);

            // Normalisation et "Escalier" (Step function)
            let height = Math.floor((n + 1) * 0.5 * amplitude);

            // Règle de "Lissage Tactique" :
            // Si la différence avec le voisin est > 2 (impassable),
            // on force une rampe ou un escalier.
            map[y * 16 + x] = smoothSlope(height, x, y, map);
        }
    }
    return map;
}
```

### 2.2. Automates Cellulaires (Biomes Organiques)
Pour simuler la corruption ("Gore", "Corruption", "Os"), nous utilisons des automates cellulaires similaires au Game of Life.
**Règles de Propagation :**
 * **Initialisation :** On place aléatoirement des "Graines de Sang" (Blood Seeds) sur la map.
 * **Itération :** Pour chaque case vide adjacente à une case de Sang :
   * Si Neighbors_{blood} \geq 3, la case devient du Sang.
   * Si Neighbors_{bone} \geq 4, la case devient un Mur d'Os (Obstacle).
**Mathématiques de Fluidité (Vein Rivers) :**
Pour créer des rivières connectées :
 * On place un point Start (haute élévation) et un point End (basse élévation).
 * On trace un chemin A* (Pathfinding) avec un coût de déplacement faible pour les creux.
 * On élargit ce chemin avec un kernel de convolution 3 \times 3 pour créer un lit de rivière naturel.

### 2.3. Connectivité & Validation (Graph Theory)
Une carte procédurale est inutile si elle est impossible à traverser. Nous devons valider la topologie avant le rendu.
**Algorithme "Jump Check" :**
Le système de mouvement de FFT dépend de la stat JUMP (défaut: 3).
 * On construit un Graphe de Connectivité G(V, E).
 * Une arête E existe entre deux tuiles adjacentes A et B si :

 * On lance un Flood Fill depuis le point de départ du joueur.
 * Si le nombre de tuiles accessibles est < 80\% de la surface totale, la carte est rejetée et régénérée.

### 2.4. Placement des Points d'Intérêt (POI)
Une fois la géométrie validée, on peuple la carte via une logique de "Heatmap Tactique".
 * **Player Spawn (Zone Bleue) :** Toujours dans une zone de "Low Ground" ou "Flat" (Variance < 1).
 * **Enemy Spawn (Zone Rouge) :**
   * Archers/Mages : Priorité aux tuiles avec Height > Average + 2 (Avantage tactique).
   * Tanks/Melee : Priorité aux "Choke Points" (Passages étroits de largeur 1 ou 2).

### 2.5. Système de "Props" Dynamiques (Destructibilité)
Les objets ne sont pas statiques. Chaque élément de décor possède des PV et une physique.
**Structure d'Objet Interactif :**
```javascript
const PROP_TYPES = {
    BARREL_EXPLOSIVE: 1,
    BONE_PILLAR: 2,
    FLESH_MOUND: 3
};

// Logique de collision
function checkPropCollision(prop, damageType) {
    if (prop.type === PROP_TYPES.BARREL_EXPLOSIVE && damageType === 'FIRE') {
        triggerExplosion(prop.x, prop.y, radius=2, damage=50);
        removeProp(prop);
    }
}
```

**Règles de génération des Props :**
 * **Densité :** Density = 0.15 (15% des cases libres contiennent un objet).
 * **Clustering :** Les objets tendent à apparaître en groupes de 2 ou 3 (utilisation de Bruit Bleu pour la distribution).

### 2.6. Procedural Asset Generation (Sprite Generator)
Pas d'images externes. Tout est généré au runtime.
* **Algorithme :** Grille de pixels (8x8 ou 16x16) avec symétrie verticale.
* **Style :** Organique/Gore. Utilisation de bruit pour les textures.
* **Sortie :** `OffscreenCanvas` converti en `ImageBitmap` pour le rendu rapide.

### 2.7. Biomes Spécifiques (Exemples Mathématiques)
 * **The Spine Ridge (La Crête Dorsale) :**
   * Fonction : H(x) = |sin(x)| \times 10. Crée une arête centrale très haute.
   * Gameplay : Combat linéaire sur une corniche étroite. Chute = Mort.
 * **The Acid Pools (Les Bassins d'Acide) :**
   * Fonction : Inversion du bruit de Perlin. Les zones hautes deviennent des creux remplis de liquide Acid (Dégâts/Tour).
   * Gameplay : Force le joueur à utiliser le "Knockback" pour pousser les ennemis dans les trous.

---

## Module 3: Entity Systems, Stats & Data Structures

### 3.1. Architecture des Entités (Hybrid ECS)
Pour gérer efficacement les unités (Héros, Ennemis, Monstres) sans overhead, nous utilisons une architecture hybride. Les "Données Chaudes" (utilisées à chaque frame : HP, CT, Position) sont stockées dans des TypedArrays pour la rapidité d'accès. Les "Données Froides" (Noms, Inventaire, Lore) sont des objets JS standard.

**Structure Mémoire (Hot Data - Max 32 unités actives) :**
```javascript
const MAX_UNITS = 32;

// Position & État physique
const unitX = new Uint8Array(MAX_UNITS);
const unitY = new Uint8Array(MAX_UNITS);
const unitZ = new Uint8Array(MAX_UNITS); // Hauteur actuelle
const unitDir = new Uint8Array(MAX_UNITS); // 0:Sud, 1:Ouest, 2:Nord, 3:Est

// Stats Vitales
const unitHP = new Int16Array(MAX_UNITS);    // Flesh Integrity
const unitMaxHP = new Int16Array(MAX_UNITS);
const unitBP = new Int16Array(MAX_UNITS);    // Blood Pool (Mana)
const unitMaxBP = new Int16Array(MAX_UNITS);

// Moteur Temporel (CT)
const unitCT = new Uint8Array(MAX_UNITS);    // Charge Time (0-100+)
const unitSpeed = new Uint8Array(MAX_UNITS); // Vitesse de base (6-15)

// Flags d'État (Bitmask 32-bit)
const unitStatus = new Uint32Array(MAX_UNITS);
```

### 3.2. Stats Primaires et Formules Dérivées
Contrairement à FFT classique (Brave/Faith), Vermilion utilise Adrenaline et Corruption.
**A. Les Stats de Base :**
 * **PA (Physical Aggression) :** Dégâts de mêlée.
 * **MA (Mental Agony) :** Puissance des sorts de sang.
 * **SPD (Speed) :** Taux de remplissage du CT.
 * **ADR (Adrenaline - ex Brave) :** % de chance de réaction et multiplicateur de dégâts physiques.
   * Si ADR < 10, unité "Panicked" (Incontrôlable).
 * **COR (Corruption - ex Faith) :**
   * Dégâts Magiques Reçus = Damage \times \frac{COR}{100}
   * Dégâts Magiques Infligés = MA \times \frac{COR}{100}
   * Si COR > 95, l'unité meurt et devient un monstre ennemi (Game Over pour ce perso).
**B. Formule de Dégâts (Standard Melee) :**
Pour une épée standard (WP = Weapon Power) :
`Damage = PA * (WP / 100) * ADR`
**C. Formule de Précision (Hit Rate) :**
Attaquer de face, de côté ou de dos modifie drastiquement les chances.
 * Front : DirectionMod = 1.0 (peut être bloqué par le bouclier).
 * Side : DirectionMod = 1.5 (Bouclier ignoré).
 * Back : DirectionMod = 2.0 (Touche presque toujours).

### 3.3. Système de "Limb Loss" (Dégâts Localisés)
Au lieu de simples HP, chaque unité possède une structure de corps simplifiée. C'est un modificateur appliqué sur les stats de base.
**Bitmask des Membres (Uint8) :**
 * 0x01 : Bras Gauche (Arme secondaire désactivée).
 * 0x02 : Bras Droit (Arme principale désactivée, PA réduit de 50%).
 * 0x04 : Jambes (Move réduit à 1, Jump à 0, Evasion à 0%).
 * 0x08 : Tête (Silence permanent, précision aveugle).
**Algorithme de blessure :**
Si une attaque inflige > 30\% des MaxHP en un coup :
```javascript
function checkLimbLoss(damage, maxHP, targetId) {
    const severity = damage / maxHP;
    if (severity > 0.30) {
        // Chance de perdre un membre
        const roll = Math.random();
        if (roll < severity) {
            severLimb(targetId); // Applique le debuff permanent
            spawnGoreParticles(targetId, 50); // VFX
        }
    }
}
```

### 3.4. Gestion des Statuts (Bitwise Operations)
Pour optimiser les performances JS, tous les états temporaires sont gérés via des opérations binaires sur un entier 32 bits (unitStatus).
**Mapping des Bits :**
 * 1 << 0 : Dead (Cristal/Cadavre)
 * 1 << 1 : Bleeding (Perd 5% HP par case déplacée)
 * 1 << 2 : Poison (Perd 10% HP par tour)
 * 1 << 3 : Stun (Passe le tour, CT reset à 0)
 * 1 << 4 : Oil (Dégâts Feu x2)
 * 1 << 5 : Protect (Réduit dégâts Physiques de 33%)
**Vérification Rapide (O(1)) :**
```javascript
const STATUS_DEAD = 1;
const STATUS_BLEED = 2;

function isDead(id) {
    return (unitStatus[id] & STATUS_DEAD) !== 0;
}

function applyBleed(id) {
    unitStatus[id] |= STATUS_BLEED; // Active le bit
}

function cureBleed(id) {
    unitStatus[id] &= ~STATUS_BLEED; // Désactive le bit
}
```

### 3.5. Mathématiques de Croissance (Level Up)
Le système de progression n'est pas linéaire. Chaque Job possède des multiplicateurs de croissance (GrowthC). Plus GrowthC est petit, meilleure est la stat.
**Exemple de constantes C (Growth Modifiers) :**
 * **Flesh-Carver (Squire) :** HP_C = 10, PA_C = 45.
 * **Bulwark (Knight) :** HP_C = 6 (HP massifs), PA_C = 40, SP_C = 100 (Lent).
 * **Sinew Hunter (Archer) :** PA_C = 45, SP_C = 80 (Rapide).
**Calculateur de Dégradation (Mise à jour Roguelite) :**
À chaque niveau gagné, l'unité vieillit.
 * MaxHP augmente.
 * MaxSanity diminue de 1 point.
 * Conséquence : Les vétérans de haut niveau sont puissants mais fragiles mentalement (risquent de devenir des monstres).

### 3.6. Structure de l'Inventaire (JSON)
Les objets sont définis statiquement dans une base de données JSON, référencés par ID.
**Format d'Item :**
```json
{
  "id": 104,
  "name": "Serrated Bone Blade",
  "type": "SWORD",
  "wp": 12,
  "w_ev": 15,
  "range": 1,
  "element": "NONE",
  "effect": {
    "onHit": "ADD_BLEED",
    "chance": 0.25
  },
  "description": "Une épée faite d'un fémur aiguisé. Cause des hémorragies."
}
```

**Formule de Parry (Parade) :**
Lors d'une attaque frontale, l'arme peut parer.
Si Roll < ChanceToParry, l'attaque est annulée (Animation "Cling").

---

## Module 4: Combat Engine & Resolution (The Slaughter Loop)

### 4.1. Moteur de Pathfinding (A* Tactique)
Le déplacement n'est pas libre ; il est contraint par la grille, la hauteur, et les fluides. Nous utilisons une variante de l'algorithme A* (A-Star) optimisée pour la 2.5D.
**Contraintes de Mouvement :**
 * **Coût (G-Score) :**
   * Tuile Standard : 1
   * Tuile Sang/Eau : 2 (Ralentissement)
   * Tuile Boue/Viscères : 3
 * **Validation (Passability) :**
   * Une tuile est valide si : |Z_{current} - Z_{next}| \leq Unit_{Jump}
   * Une tuile est bloquée si : Une unité ennemie est présente (sauf compétence Fly ou Ghost).

**Implémentation JS (Priority Queue simplifiée) :**
```javascript
// Calcul de la zone de déplacement (Flood Fill avec coût)
function getMoveRange(unit, map) {
    let openSet = [{ x: unit.x, y: unit.y, cost: 0 }];
    let closedSet = new Uint8Array(map.size * map.size); // Visité
    let validTiles = [];

    while (openSet.length > 0) {
        // Pop le nœud le moins coûteux (Tri manuel ou Binary Heap)
        openSet.sort((a, b) => a.cost - b.cost);
        let current = openSet.shift();

        let idx = current.y * map.size + current.x;
        if (closedSet[idx]) continue;
        closedSet[idx] = 1;
        validTiles.push(current);

        // Voisins (N, S, E, W)
        getNeighbors(current, map).forEach(next => {
            let moveCost = getTileCost(map, next.x, next.y); // 1, 2, ou 3
            let heightDiff = Math.abs(map.height[idx] - map.height[next.idx]);

            if (heightDiff <= unit.jump && (current.cost + moveCost) <= unit.move) {
                openSet.push({
                    x: next.x,
                    y: next.y,
                    cost: current.cost + moveCost
                });
            }
        });
    }
    return validTiles;
}
```

### 4.2. Géométrie de Ciblage (AoE & Range)
Les compétences utilisent des formes géométriques strictes pour déterminer les cibles.
**Types de Zone (Area of Effect) :**
 * **Single Unit :** Cible U(x, y, z).
 * **Cross (Croix) :** 5 cases (Centre + N/S/E/W). Formule : |x - cx| + |y - cy| \leq 1
 * **Rhombus (Losange) :** Zone standard des sorts. Formule : |x - cx| + |y - cy| \leq Radius
 * **Cone (Souffle) :** Triangle isocèle orienté selon la direction de l'unité.
 * **Linear (Fusil/Laser) :** Raycasting 2D. Bloqué par le premier obstacle.
**Tolérance Verticale (Vertical Tolerance) :**
Chaque compétence possède une valeur Vertical.
 * Une cible est valide seulement si : |Z_{target} - Z_{center}| \leq Vertical.
 * Exemple : Fire (Range 3, Vertical 1) ne peut pas toucher un ennemi sur un toit si lancé depuis le sol.

### 4.3. Séquence de Résolution (The Attack Stack)
Lorsqu'une action est validée, le moteur exécute une pile d'événements stricts.
**La boucle de résolution :**
 1. **Initiation :** L'attaquant paie le coût en MP/HP.
 2. **Projection :** Si l'attaque est à distance (Flèche, Magie), calcul de la trajectoire.
    * Collision : Si un obstacle (Mur, autre unité) coupe la ligne de vue, l'attaque échoue ou touche l'obstacle.
 3. **Roll de Touche (Accuracy Check) :**
    * Si Random(0, 100) > Chance, c'est un MISS.
 4. **Réaction (Pre-Hit) :** Vérifie si la cible a First Strike ou Blade Grasp.
 5. **Dommages :** Application de la formule (Physique ou Magique).
 6. **Knockback (Recul) :**
    * Si l'attaque a la propriété Impact, la cible est poussée de 1 case.
    * Si la case derrière est bloquée ou a un Z trop haut \rightarrow Dégâts additionnels (Crushing Damage).
    * Si la case derrière est un vide \rightarrow Dégâts de chute (FallDamage = \Delta Z \times 10\% MaxHP).
 7. **Réaction (Post-Hit) :** Vérifie Counter, Auto-Potion.

### 4.4. Système de Réaction (Adrenaline Trigger)
Contrairement aux RPG passifs, Vermilion permet de répondre pendant le tour de l'adversaire.
Ceci est régi par la stat Adrenaline (ADR).
**Algorithme de Déclenchement :**
```javascript
function tryReaction(attacker, defender, reactionAbility) {
    if (!reactionAbility) return false;
    let chance = defender.stats.ADR;
    if (defender.status.has("CHICKEN")) chance = 0;
    if (defender.status.has("BERSERK")) chance = 100;

    if (Math.random() * 100 < chance) {
        executeReaction(defender, attacker, reactionAbility);
        return true;
    }
    return false;
}
```
**Types de Réactions "Gore" :**
 * **Meat Shield :** (Monk) Si une unité adjacente est attaquée, prend les dégâts à sa place.
 * **Spurt Blood :** (Hemomancer) Quand touché, projette du sang acide (AoE 1) qui aveugle l'attaquant.
 * **Death Throes :** (Zombie) À la mort, explose en infligeant des dégâts égaux aux MaxHP.

### 4.5. Interface de Combat (Overlay HTML/CSS - Mobile First)
Le Canvas gère le rendu, mais l'UI est en HTML pur pour la netteté du texte et le support Mobile.
**Structure DOM :**
```html
<div id="ui-layer">
  <div class="action-menu glass-panel">
    <button onclick="selectAction('MOVE')">Move</button>
    <button onclick="selectAction('ACT')">Act</button>
    <button onclick="selectAction('WAIT')">Wait</button>
    <button onclick="selectAction('STATUS')">Status</button>
  </div>

  <div class="combat-forecast">
    <div class="hp-bar-preview">
       <span class="current">120</span> -> <span class="predicted">45</span>
    </div>
    <div class="hit-chance">Hit: 85%</div>
  </div>
</div>
```
**Styling CSS (Dark Fantasy & Mobile) :**
* **Glass Panel:** `background: rgba(20, 0, 0, 0.85);`
* **Mobile Controls:** Buttons must be at least 44x44px.

---

## Module 5: Job System & Ability Architecture (The Flesh & The Ichor)

### 5.1. Philosophie du "Body Horror" Progression
Au lieu d'apprendre des techniques martiales, les personnages de Vermilion subissent des mutations volontaires. Le "Job Wheel" (Roue des Jobs) est un Arbre de Mutation.
 * **Ressource d'Évolution :** Pas de JP (Job Points). On utilise de la Biomass récoltée sur les cadavres.
 * **Coût :** Changer de Job coûte de l'Humanité (Sanity). Trop de changements = Game Over (Le personnage devient un monstre PNJ).
**Arbre Simplifié :**
 * Base : Flesh-Carver (L'équivalent Squire).
 * Tier 1 (Physical) : Bulwark (Knight), Sinew Hunter (Archer), Grappler (Monk).
 * Tier 1 (Magical) : Plague Doctor (White Mage), Pyre Corpse (Black Mage).
 * Tier 2 (Advanced) : Hemomancer, Entropist, Skin-Walker.

### 5.2. Structure de Données des Jobs (JSON Configuration)
Chaque classe est un objet de configuration statique chargé au démarrage.
```javascript
const JOBS = {
    FLESH_CARVER: {
        id: 0,
        name: "Flesh-Carver",
        requirements: null, // Classe de départ
        stats: {
            hp_growth: 12,  // Plus bas = Meilleur (1/12eme par niveau)
            pa_growth: 50,
            ma_growth: 60,
            spd_growth: 100
        },
        equipment: ["KNIFE", "AXE", "LIGHT_ARMOR"],
        action_skill: "SURVIVAL_INSTINCT",
        innate: ["GUTTER_BLOOD"] // Passif toujours actif
    },
    BULWARK: {
        id: 1,
        name: "Bulwark of Bone",
        requirements: { FLESH_CARVER: 2 }, // Niveau 2 requis
        stats: {
            hp_growth: 8,   // Tank (HP massifs)
            pa_growth: 40,
            ma_growth: 70,
            spd_growth: 120 // Très lent
        },
        equipment: ["HEAVY_SHIELD", "HAMMER", "PLATE"],
        action_skill: "OSTEOMANCY"
    }
};
```

### 5.3. Architecture des Compétences (Action, Reaction, Support, Move)
Comme dans FFT, chaque unité a 4 slots de personnalisation.
 * Action Skill : Le kit actif du Job (ex: Black Magic).
 * Reaction Skill : S'active sous condition (ex: Counter).
 * Support Skill : Bonus passif (ex: Short Charge).
 * Move Skill : Modificateur de déplacement (ex: Move+1, Ignore Height).

**Implémentation d'une Compétence Active (Scriptable Object) :**
```javascript
const ABILITIES = {
    // Compétence du Bulwark : Fait exploser ses propres os
    "BONE_SHRAPNEL": {
        range: 0,       // Self
        aoe: 2,         // Radius 2
        cost_hp: 0.15,  // Coûte 15% des MaxHP
        cost_mp: 0,
        vertical: 2,    // Touche les ennemis 2 cases plus haut/bas
        formula: "PHYSICAL_AOE",
        element: "PIERCE",
        effect: (caster, targets) => {
            targets.forEach(t => {
                let dmg = calculateDamage(caster, t);
                applyDamage(t, dmg);
                // 30% chance d'infliger "Bleeding"
                if (Math.random() < 0.3) addStatus(t, "BLEEDING");
            });
        }
    }
};
```

### 5.4. Mathématiques des Compétences "Signature"
Voici 3 exemples de mécaniques uniques qui définissent le gameplay de Vermilion.
**A. Le Sinew Hunter (Archer Gore)**
Utilise ses tendons pour tirer plus loin.
 * Skill : Tether Shot
 * Effet : Relie la cible au lanceur.
 * Maths : Si la distance entre Caster et Target augmente de > 1 case au tour suivant, la cible subit des dégâts massifs.
**B. Le Pyre Corpse (Mage de Feu)**
S'immoler pour brûler les autres.
 * Skill : Living Bomb
 * Effet : Le lanceur gagne le statut ON_FIRE.
 * Maths :
   * À chaque début de tour : SelfDamage = 5\% MaxHP.
   * Bonus aux sorts de Feu : +50\% Damage.
   * Si le lanceur meurt sous cet effet : Explosion finale (Area=3, Damage=RemainingHP \times 2).
**C. L'Hemomancer (Mage de Sang)**
Manipule les fluides sur le terrain.
 * Skill : Coagulate
 * Effet : Transforme toutes les tuiles LIQUID_BLOOD en SOLID_SCAB (murs temporaires ou ponts).

### 5.5. Le Système de "Cannibalize" (Soin & MP)
Il n'y a pas de Potions ou d'Ether dans Vermilion. La seule façon de se soigner est de consommer.
**Mécanique du Cadavre :**
Quand une unité meurt, elle laisse un corps (Timer: 3 tours).
N'importe quelle unité adjacente peut utiliser l'action universelle Devour.
**Formule de Gain :**
 * Si Cible = Ennemi : Gain HP/MP
 * Si Cible = Allié : Gain HP/MP + Hérite d'une compétence aléatoire (Système Crystal de FFT), mais rend fou (Sanity -).

### 5.6. Calculateur de Coût d'Expérience (Biomass Scaling)
Pour éviter le "grind" infini, le coût des compétences augmente exponentiellement.
Soit N le nombre de compétences déjà apprises dans ce Job.
Le coût de la prochaine compétence C_{next} est :
 * Exemple : Skill 1 (100 Biomass) -> Skill 2 (150 Biomass) -> Skill 3 (225 Biomass).
 * Design : Force le joueur à se spécialiser.

### 5.7. Visualisation UI (Arbre de Compétences)
L'interface de gestion n'est pas une liste, mais un Système Nerveux (Nœuds reliés par des veines).

---

## Module 6: Artificial Intelligence & Threat Assessment ( The Predator Engine)

### 6.1. Philosophie de l'IA (Utility-Based Behavior)
L'IA ne doit pas être "intelligente" au sens humain, elle doit être cruelle. Les ennemis optimisent la souffrance du joueur (focus sur les unités faibles, achèvement des mourants).
Nous utilisons un système de Utility Scoring (Score d'Utilité).

### 6.2. Architecture Décisionnelle (The Brain Loop)
À chaque tour ennemi, le moteur évalue toutes les combinaisons possibles : (MovePosition, Action, Target, Rotation).
**Formule de Score Global :**
Pour chaque tuile accessible (x, y) et chaque compétence S, le score U est :
 * **W_{kill} (Poids Létal) :** Si PV Target < Dégâts : W = 50.0 (Priorité absolue).
 * **Safety :** Score de la position d'arrivée (Hauteur, Dos exposé).
 * **W_{cc} (Cruauté) :** Bonus si l'action inflige un statut invalidant ou pousse dans un piège.

### 6.3. Cartes d'Influence (Influence Maps)
Pour que l'IA se déplace intelligemment sans tricher, elle génère une "Carte de Danger" en mémoire (Heatmap).
 * **Archétype "Tank" :** Cherche les cases où Danger est MAXIMAL (pour bloquer).
 * **Archétype "Assassin" :** Cherche les cases où Danger est MINIMAL mais proche d'une cible (Flanking).

### 6.4. Behavior Trees (Logique Séquentielle)
Une fois la position choisie, l'IA exécute un arbre de décision pour l'action spécifique.
```javascript
// Cerveau d'un "Ghoul" (Charognard)
const GHOUL_BRAIN = new Selector([
    new Sequence([Condition.IsCorpseNearby, Action.EatCorpse]), // Prio 1: Manger
    new Sequence([Condition.CanKill, Action.AttackFatal]),       // Prio 2: Tuer
    new Sequence([Condition.IsThreatened, Action.Flee]),         // Prio 3: Fuir
    new Action.WaitAmbush()                                      // Prio 4: Attendre
]);
```

### 6.5. Gestion des Fluides et de l'Environnement
L'IA de Vermilion comprend la physique du monde.
**A. Pousser dans le vide (Knockback Logic) :**
Si une compétence a un effet KNOCKBACK, l'IA scanne les cibles potentielles.
 * Si Tile_Behind est un vide (Z_{delta} > 3) ou de la Lave, le score augmente massivement.
**B. Propagation Élémentaire :**
Si l'IA possède un sort de Foudre (THUNDER), elle scanne les tuiles d'Eau/Sang connectées aux héros pour maximiser les dégâts de conduction.

### 6.6. Coordination de Groupe (The Hive Mind)
Les ennemis partagent une "Blackboard" (Mémoire partagée).
 * **TargetFocus :** ID de l'unité du joueur la plus vulnérable.
 * **ReservedTiles :** Tuiles où une unité ennemie compte aller ce tour-ci (évite que deux ennemis se bloquent).

### 6.7. Optimisation des Performances (Time Slicing)
La logique IA tourne dans un WebWorker ou est répartie sur plusieurs frames pour ne pas bloquer les 60fps.

---

## Module 7: Economy, Procedural Loot & Meta-Progression (The Addiction Loop)

### 7.1. Philosophie de l'Économie (Scarcity & Sacrifice)
L'or n'a aucune valeur. La monnaie unique est le Crimson Aether (sang cristallisé) et les Organes.
L'économie est déflationniste : le joueur doit constamment dépenser pour survivre.
**Les 3 Piliers de l'Échange :**
 * Aether : Monnaie liquide.
 * Biomass : XP pour les Jobs.
 * Viscera (Loot) : Matériaux d'artisanat.

### 7.2. Algorithme de Loot Procédural (The Butcher Engine)
Le système d'objets s'inspire de Diablo mais adapté aux contraintes tactiques.
Un objet est généré par l'assemblage de 4 composants : [Matériau] [Type] [Suffixe].
```javascript
function generateLoot(level, rarity) {
    // 1. Sélection du Type
    // 2. Sélection du Matériau (Os, Acier Noir, Obsidienne)
    // 3. Calcul des Stats
    // 4. Ajout d'Affixes (Traits Spéciaux)
}
```
**Mathématiques des Affixes (Exemples) :**
 * "Of the Leech" : OnHit: Heal(Damage * 0.10)
 * "Weightless" : CT_Cost: -20 (Attaque plus vite)
 * "Serrated" : Chance_Bleed: +25%

### 7.3. Le Système de Crafting (The Flesh Forge)
Le joueur doit assembler les organes récoltés sur les ennemis pour créer de l'équipement.
 * Exemple : Skeleton \rightarrow Femur (Blade), Skull (Helm).
 * Succès Critique : Si Roll < 5\%, l'objet gagne un affixe "Maudit" (Stats x1.5, mais effet négatif passif).

### 7.4. Méta-Progression (The Heritage System)
Vermilion est un Roguelite. La mort est définitive pour l'équipe, mais pas pour la lignée.
**Ce qui est conservé (The Vault) :**
 * **Heirlooms (Objets Héritage) :** Une seule arme peut être marquée comme "Relique Familiale".
 * **Knowledge (Bestiaire) :** Les bonus de dégâts contre les types d'ennemis connus (+1\% par 50 kills).
 * **Citadel Upgrades :** Améliorations passives du HUB central (Infirmerie, Bibliothèque).

### 7.5. Équilibrage de la Difficulté (The Director)
Pour maintenir la tension, le jeu surveille la puissance du joueur et ajuste les ennemis dynamiquement.
 * Si PR_{Team} > Expected_{PR} + 20\%, le "Director" active des mutateurs (Elite Pack, Trap Density, Anti-Strat).

### 7.6. Sauvegarde et Persistance (Technical)
Pour un jeu navigateur sans serveur, nous utilisons le localStorage ou IndexedDB.
**Encodage de la Sauvegarde (Anti-Triche) :**
Le JSON de l'état du jeu est converti en Base64 et haché.
**Mode Ironman :**
La sauvegarde est supprimée dès le chargement.
