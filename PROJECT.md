# Project VERMILION: Technical Design Document

## Module 1: Core Engine & Isometric Architecture

### 1.1. Philosophie du Moteur (The "Zodiac" Engine)
Le cœur du jeu repose sur une simulation pseudo-3D rendue en 2D (2.5D), écrite en Vanilla ES6 JavaScript. L'objectif est de reproduire le "feel" exact de la grille Final Fantasy Tactics (mouvement case par case, gestion de la hauteur, rotation de caméra à 90°) tout en intégrant des fluides dynamiques (sang).

**Stack Technique (STRICT VANILLA) :**
* **No Build System :** Pas de Vite, Webpack ou npm. Utilisation native de ES6 Modules (`<script type="module">`). Le jeu doit tourner directement depuis `index.html`.
* **Rendering :** HTML5 Canvas API (Context 2D) pour le jeu.
* **UI Layer :** DOM HTML/CSS pour l'interface (Mobile First).
* **State Management :** Typed Arrays pour la gestion mémoire sans Garbage Collection.
* **Inputs :** Mobile First (Touch Events: Tap, Double Tap, Long Press).

### 1.2. Mathématiques de Projection Isométrique
La conversion de l'espace logique (x, y, z) vers l'espace écran (sx, sy) est fondamentale.

**Constantes de la Grille :**
* `TILE_WIDTH`: 64px
* `TILE_HEIGHT`: 32px (Ratio 2:1 standard isométrique)
* `HEIGHT_SCALE`: 16px (1 unité de hauteur h = 16 pixels verticaux)

**Formules de Projection :**
Implémentation JS (Optimisée) :
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
    }
}
```

### 1.4. Algorithme de Rendu (Painter's Algorithm)
Pour simuler la profondeur sans Z-Buffer 3D, l'ordre de dessin est critique.

**Ordre de boucle :**
1. On dessine du fond vers l'avant (Back-to-Front).
2. Boucle Y (0 -> Max)
3. Boucle X (0 -> Max)
4. À chaque coordonnée (x, y), on dessine :
   * Le bloc de terrain (hauteur z).
   * L'objet ou l'unité posé dessus.
   * Les effets de particules (sang, fumée) triés par z.

### 1.5. Le Moteur Temporel (The Clocktick System)
Le système "Active Time Battle" (ATB) modifié.
* **Mathématiques du CT (Charge Time) :** Chaque entité a un CT (0-100) et une Speed. L'unité agit quand CT >= 100.
* **Priorité :** Si plusieurs unités dépassent 100 au même tick, on favorise la plus rapide.

### 1.6. The Fluid Engine (Phase 1.5 - Prioritaire)
Le sang n'est pas un décor, c'est une mécanique physique.
* **Simulation :** Cellular Automata sur la grille.
* **États :**
    * **Liquid :** Se propage vers le bas (z) et les côtés. Fait glisser (Move Cost +).
    * **Dried :** Devient solide après X tours.
    * **Coagulated :** Bloque le passage.
* **Rendu :** Particules de pixels (pas de carrés unis).

### 1.7. Système de "Juice" & Caméra
* **Impact Shake :** `CamOffset = sin(t) * Damage_amount * 0.5`
* **Zoom Dynamique :** Scale -> 1.5 sur la cible lors des compétences.
* **Rotation :** Rotation de 90°. `NewY = -OldX` (Nécessite re-tri du tableau de rendu).

---

## Module 2: Procedural Generation & "Noise" Architecture

### 2.1. L'Algorithme "Flesh-Carver" (Topologie du Terrain)
Utilisation de bruit de Perlin quantifié combiné à des "Coupures Voronoi".

**Formule de Hauteur :**
* **Quantification (Step) :** Arrondi à l'entier le plus proche.
* **Amplitude (A_i) :** MaxHeight = 16.

### 2.2. Automates Cellulaires (Biomes Organiques)
Règles de propagation pour "Gore", "Corruption", "Os".

### 2.3. Connectivité & Validation
* **Algorithme "Jump Check" :** Flood Fill depuis le départ. Si < 80% des tuiles sont accessibles, régénération.

### 2.4. Placement des Points d'Intérêt (POI)
* **Player Spawn :** Low Ground / Flat.
* **Enemy Spawn :** High Ground (Archers) ou Choke Points (Tanks).

### 2.5. Système de "Props" Dynamiques
Structure `PROP_TYPES`. Collision et destructibilité (ex: Tonneau explosif).
* Densité = 0.15. Clustering via Bruit Bleu.

### 2.6. Procedural Asset Generation (Sprite Generator)
Pas d'images externes. Tout est généré au runtime.
* **Algorithme :** Grille de pixels (8x8 ou 16x16) avec symétrie verticale.
* **Style :** Organique/Gore. Utilisation de bruit pour les textures.
* **Sortie :** `OffscreenCanvas` converti en `ImageBitmap` pour le rendu rapide.

### 2.7. Biomes Spécifiques
* **The Spine Ridge :** `H(x) = |sin(x)| * 10`.
* **The Acid Pools :** Inversion de Perlin.

---

## Module 3: Entity Systems, Stats & Data Structures

### 3.1. Architecture des Entités (Hybrid ECS)
Données chaudes dans TypedArrays (Max 32 unités).
```javascript
const MAX_UNITS = 32;
const unitX = new Uint8Array(MAX_UNITS);
const unitY = new Uint8Array(MAX_UNITS);
const unitZ = new Uint8Array(MAX_UNITS);
const unitDir = new Uint8Array(MAX_UNITS);
const unitHP = new Int16Array(MAX_UNITS);
// ... etc
```

### 3.2. Stats Primaires
* PA, MA, SPD, ADR (Adrenaline), COR (Corruption).
* Formules de dégâts physiques et précision directionnelle (Front 1.0, Side 1.5, Back 2.0).

### 3.3. Système de "Limb Loss"
Si dégâts > 30% MaxHP : chance de perdre un membre (Bras, Jambes, Tête) avec malus permanents.

### 3.4. Gestion des Statuts (Bitwise)
Bitmask 32-bit pour états : Dead, Bleeding, Poison, Stun, Oil, Protect.
Opérations binaires pour performance O(1).

### 3.5. Mathématiques de Croissance
Pas linéaire. `GrowthC` (Growth Constant) par Job.
* **Dégradation :** MaxHP augmente, mais MaxSanity diminue avec le niveau.

### 3.6. Inventaire
JSON statique. Armes avec `wp`, `w_ev`, `range`, `effect`.

---

## Module 4: Combat Engine & Resolution

### 4.1. Pathfinding (A* Tactique)
Coût basé sur terrain (Sang/Eau = 2). Validation via hauteur (`|Z_curr - Z_next| <= Unit_Jump`) et obstacles.

### 4.2. Géométrie de Ciblage
AoE : Single, Cross, Rhombus, Cone, Linear.
Tolérance Verticale stricte.

### 4.3. Séquence de Résolution
Initiation -> Projection -> Roll de Touche -> Réaction (Pre-Hit) -> Dommages -> Knockback (Dégâts chute/mur) -> Réaction (Post-Hit).

### 4.4. Système de Réaction (Adrenaline Trigger)
Basé sur la stat ADR. Types : Meat Shield, Spurt Blood, Death Throes.

### 4.5. Interface de Combat (Mobile First)
Hybride : Jeu en Canvas, UI en DOM.
* **Controls :**
    * Tap : Sélection / Déplacement.
    * Double Tap : Validation Action.
    * Long Press : Info / Tooltip.
* **Layout :** Gros boutons pour les pouces. Zones de touches étendues.

---

## Module 5: Job System & Ability Architecture

### 5.1. Philosophie "Body Horror"
Biomass (XP). Coût en Humanité (Sanity) pour changer de Job.
Arbre : Flesh-Carver -> Bulwark/Sinew Hunter/Grappler -> etc.

### 5.2. Structure des Jobs (JSON)
Config statique avec stats growth, équipement, compétences innées/actives.

### 5.3. Architecture Compétences
Slots : Action, Reaction, Support, Move.
Définition scriptable des effets (ex: `BONE_SHRAPNEL`).

### 5.4. Compétences Signature
* **Sinew Hunter :** Tether Shot.
* **Pyre Corpse :** Living Bomb (Self-burn pour bonus dmg).
* **Hemomancer :** Coagulate (Solidifie le sang).

### 5.5. Cannibalize
Soin uniquement via "Devour" sur cadavres. Manger un allié rend fou mais donne ses skills.

### 5.6. Coût d'Expérience
Coût exponentiel en Biomass pour éviter le tout-avoir.

### 5.7. Visualisation UI
Arbre "Système Nerveux" en HTML/Canvas.

---

## Module 6: AI & Threat Assessment

### 6.1. Utility-Based Behavior
Score d'utilité pour chaque action possible. Focus sur la "cruauté" (Kill, Debuff, Piège).

### 6.2. Architecture Décisionnelle
Boucle : Move -> Action -> Target -> Rotation.
Scores : Poids Létal, Safety, Cruauté.

### 6.3. Cartes d'Influence
Heatmap de danger pour positionnement (Tank vs Assassin vs Mage).

### 6.4. Behavior Trees
Séquences logiques (ex: Ghoul = Eat > Kill > Flee > Wait).

### 6.5. Fluides & Environnement
IA consciente du Knockback (vide/lave) et de la propagation élémentaire (Foudre dans l'eau).

### 6.6. Coordination (Hive Mind)
"Blackboard" partagée pour focus fire et éviter les blocages de mouvement.

### 6.7. Optimisation
Time Slicing (calculs répartis sur plusieurs frames).

---

## Module 7: Economy, Loot & Meta-Progression

### 7.1. Économie
Déflationniste. Monnaies : Aether, Biomass, Viscera (Craft).

### 7.2. Loot Procédural
Item = [Matériau] [Type] [Suffixe]. Stats basées sur rareté et niveau.

### 7.3. Crafting (Flesh Forge)
Synthèse d'organes (ex: Femur -> Blade).

### 7.4. Méta-Progression (Heritage)
Roguelite. Perte d'unités/inventaire. Conservation : Heirlooms, Knowledge (Bestiaire), Citadel Upgrades.

### 7.5. Difficulté (The Director)
Surveillance du Power Rating. Si trop fort, activation de mutateurs (Elite Pack, Trap Density).

### 7.6. Sauvegarde
LocalStorage/IndexedDB. Encodage Base64 + LZString. Mode Ironman (suppression au chargement).
