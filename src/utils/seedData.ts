import { Block } from '../types/ops';
import { generateBlockId } from './hashing';

export const seedDocuments = [
  {
    id: 'scene/scene-01',
    title: 'Scene 01 - Opening',
    blocks: [
      {
        id: generateBlockId(),
        type: 'heading' as const,
        level: 1,
        text: 'The Beginning',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'The old house stood at the edge of the forest, its weathered boards telling stories of centuries past. Nobody had lived there for decades, yet lights flickered in the windows every midnight.',
      },
      {
        id: generateBlockId(),
        type: 'heading' as const,
        level: 2,
        text: 'Discovery',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'Sarah first noticed the lights on a Tuesday evening. She had been driving home from work when the glow caught her eye. At first, she thought it was just moonlight reflecting off the glass, but the pattern was too regular, too deliberate.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'She pulled over to the side of the road and watched. The lights moved from window to window, as if someone was walking through the rooms carrying a lantern.',
      },
    ],
  },
  {
    id: 'scene/scene-02',
    title: 'Scene 02 - Discovery',
    blocks: [
      {
        id: generateBlockId(),
        type: 'heading' as const,
        level: 2,
        text: 'Investigation',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'The next morning, Sarah returned with her camera. In daylight, the house looked even more abandoned. The porch sagged dangerously, and ivy had claimed most of the eastern wall.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'She knocked on the door, not really expecting an answer. To her surprise, the door creaked open at her touch.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'Inside, dust motes danced in the shafts of light streaming through broken windows. The air smelled of old wood and forgotten memories. Sarah stepped carefully across the threshold, her camera ready.',
      },
    ],
  },
  {
    id: 'scene/scene-03',
    title: 'Scene 03 - Confrontation',
    blocks: [
      {
        id: generateBlockId(),
        type: 'heading' as const,
        level: 2,
        text: 'The Revelation',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'A voice called out from the shadows, making Sarah jump. "You should not have come here." The figure that emerged was neither young nor old, neither solid nor transparent.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: '"Who are you?" Sarah managed to ask, her voice steadier than she felt.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: '"I am the keeper of this place," the figure replied. "And you, Sarah, are not the first to seek answers here. But you may be the last."',
      },
    ],
  },
  {
    id: 'chapter/chapter-01',
    title: 'Chapter 01',
    blocks: [
      {
        id: generateBlockId(),
        type: 'heading' as const,
        level: 1,
        text: 'Chapter One: Shadows in the Woods',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'The autumn wind swept through the valley, carrying with it the scent of pine and distant rain. Marcus had been walking for hours, following a trail that seemed to shift and change beneath his feet.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'His grandfather had warned him about these woods. "They remember," the old man had said, his eyes distant. "They remember everything, and they never forget."',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'At the time, Marcus had dismissed it as the ramblings of an aging mind. Now, as shadows lengthened and strange sounds echoed through the trees, he was not so sure.',
      },
    ],
  },
  {
    id: 'chapter/chapter-02',
    title: 'Chapter 02',
    blocks: [
      {
        id: generateBlockId(),
        type: 'heading' as const,
        level: 1,
        text: 'Chapter Two: The Meeting',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: 'Elena was waiting at the crossroads, exactly where she said she would be. She looked different in person than she had in their video calls – more real, more present, more dangerous.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: '"You came," she said, not quite a question.',
      },
      {
        id: generateBlockId(),
        type: 'paragraph' as const,
        text: '"I said I would." Marcus approached slowly, studying her face for any sign of deception. "Now tell me what this is really about."',
      },
    ],
  },
];

