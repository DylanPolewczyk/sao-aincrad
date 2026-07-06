import * as THREE from 'three';
import { buildVillager } from './characters.js';
import { glow, sphere, cone } from './modelkit.js';

// ---------------------------------------------------------------------------
// "The Secret Medicine of the Forest" — the canon Horunka quest.
// A village woman needs a Little Nepent's Ovule (carried by the rare
// flowered Nepent) to cure her sick daughter. Reward: the Anneal Blade.
// ---------------------------------------------------------------------------

const DIALOG = {
  unstarted: [
    'Oh… a swordsman, here in Horunka?',
    'Please, hear me. My daughter is gravely ill, and no medicine in this village can help her.',
    'Deep in the western forest grow carnivorous plants — Little Nepents. Among them hides a rare one crowned with a red flower.',
    'The ovule inside that flower can be brewed into medicine. Please… bring me a Little Nepent\'s Ovule.',
  ],
  accepted: [
    'Thank you, swordsman. The flowered one hides among its kin — cut down the others and it will show itself.',
  ],
  active: [
    'The flowered Nepent hides deep in the forest, among its kin. Be careful — they hunt together.',
  ],
  ready: [
    'That flower… you found it! Thank the gods.',
    'With this, my daughter will live. I have nothing to pay you with — except this.',
    'It was my husband\'s sword. He would want a warrior to carry it. Take the Anneal Blade, and may it protect you.',
  ],
  done: [
    'My daughter is recovering, thanks to you. Bless you, swordsman of the beginning floor.',
  ],
};

export class QuestSystem {
  constructor(game) {
    this.game = game;
    this.state = 'unstarted'; // unstarted | active | ready | done
    this.nepentKills = 0;

    // the quest giver, standing at her door in Horunka
    const pos = game.world.questHousePos;
    this.npc = buildVillager(4242);
    this.npc.root.position.copy(pos);
    this.npc.root.rotation.y = Math.PI; // faces the village center
    game.scene.add(this.npc.root);
    this.npcPos = pos.clone();

    // floating quest marker
    this.marker = new THREE.Group();
    const bang = sphere(0.07, glow(0xffd24a, 2.2), 8, 6);
    bang.position.y = 0.28;
    const stem = cone(0.05, 0.3, glow(0xffd24a, 2.2), 6);
    stem.rotation.x = Math.PI;
    stem.position.y = 0.5;
    this.marker.add(bang, stem);
    this.marker.position.copy(pos).add(new THREE.Vector3(0, 2.2, 0));
    game.scene.add(this.marker);
    this.time = 0;
  }

  serialize() { return { state: this.state, kills: this.nepentKills }; }
  restore(d) {
    if (!d) return;
    this.state = d.state || 'unstarted';
    this.nepentKills = d.kills || 0;
    this.refreshHUD();
  }

  refreshHUD() {
    const ui = this.game.ui;
    if (this.state === 'active') {
      ui.setQuest('The Secret Medicine of the Forest', 'Obtain a Little Nepent\'s Ovule — hunt the flowered Nepent in Horunka Forest');
    } else if (this.state === 'ready') {
      ui.setQuest('The Secret Medicine of the Forest', 'Return the Ovule to the woman in Horunka Village');
    } else {
      ui.setQuest(null);
    }
    this.marker.visible = this.state !== 'done';
  }

  // called by the game for every enemy kill
  onKill(enemy) {
    if (this.state !== 'active') return;
    if (enemy.def.carriesOvule || ++this.nepentKills >= 5) {
      this.state = 'ready';
      this.game.ui.announce('QUEST ITEM ACQUIRED', 'Little Nepent\'s Ovule', 2800);
      this.game.audio.levelUp();
      this.refreshHUD();
      this.game.save();
    }
  }

  // called when the player presses E near the quest giver
  interact() {
    const g = this.game;
    const lines = DIALOG[this.state === 'unstarted' ? 'unstarted' : this.state];
    g.ui.showDialog('Village Woman', lines, () => {
      if (this.state === 'unstarted') {
        this.state = 'active';
        this.nepentKills = 0;
        g.ui.announce('QUEST ACCEPTED', 'The Secret Medicine of the Forest', 3000);
        g.ui.showDialog('Village Woman', DIALOG.accepted, null);
      } else if (this.state === 'ready') {
        this.state = 'done';
        g.player.equipAnnealBlade();
        g.ui.announce('OBTAINED: ANNEAL BLADE', 'Attack power greatly increased', 3400);
        g.audio.victory();
        g.effects.pillar(g.player.position, 0x6ee7ff);
      }
      this.refreshHUD();
      g.save();
    });
  }

  update(dt) {
    this.time += dt;
    if (this.marker.visible) {
      this.marker.position.y = this.npcPos.y + 2.2 + Math.sin(this.time * 2.4) * 0.12;
      this.marker.rotation.y += dt * 1.8;
      // gold "!" while available, cyan while in progress
      const c = this.state === 'ready' ? 0x6ee7ff : 0xffd24a;
      this.marker.children.forEach((m) => m.material.color.setHex(c));
    }
  }
}
