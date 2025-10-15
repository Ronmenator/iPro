// Script to add research entry for "The Veil Between Life and Death"
const fs = require('fs');
const path = require('path');

// Read the current book file if it exists
const bookPath = path.join(__dirname, 'The Veil.json');
let book = null;

if (fs.existsSync(bookPath)) {
  try {
    book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
  } catch (error) {
    console.error('Error reading book file:', error.message);
    process.exit(1);
  }
} else {
  console.log('No book file found. Please create or load a book first.');
  process.exit(1);
}

// Generate a unique ID
function generateId() {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create the research entry
const researchEntry = {
  id: generateId(),
  title: 'The Veil Between Life and Death in Mythology',
  content: `# The Veil Between Life and Death in Mythology

## Overview
The concept of a "veil" between life and death is a recurring theme in many mythologies, spiritual traditions, and folklore. Across cultures, this veil represents a boundary between the living and the dead, the physical and spiritual worlds, often described as thin, permeable, or able to be crossed under certain conditions.

## Celtic Mythology
- **Samhain (Celtic Festival)**: The ancient Celts believed that during Samhain (October 31–November 1), the veil between worlds became thin. Spirits of the dead could visit the living, and humans could communicate with ancestors.
- **Otherworld**: In Celtic belief, the Otherworld is a realm of the dead and supernatural beings. The boundary between worlds is often crossed through mists, lakes, or special times of year.
- **Thin Places**: Celtic spirituality speaks of "thin places" where the distance between physical and spiritual reality is minimal (hilltops, ancient stone circles, shorelines).

## Ancient Greek Beliefs
- **Hades and the River Styx**: The Greeks imagined the journey from life to death as crossing the River Styx, ferried by Charon. This river acted as a liminal boundary — a kind of "veil" between the living world and the underworld.
- **Orpheus & Eurydice**: In this myth, Orpheus crosses the boundary to retrieve his wife from death, but loses her again when he looks back — illustrating the fragility of crossing the veil.

## Norse Mythology
- **Hel**: The realm of the dead ruled by the goddess Hel. Certain times (such as during great battles) were believed to thin the boundaries between the living world and Hel's domain.
- **Seiðr Magic**: Norse mystics and sorcerers (seiðr practitioners) were said to communicate with spirits and glimpse the other side, often through trance or ritual.

## Ancient Egyptian Beliefs
- **Duat (Underworld)**: The Egyptians saw death as a journey through the Duat, a realm between life and the afterlife. Rituals, spells (from the Book of the Dead), and proper burial were needed to navigate this veil.
- **Ka & Ba**: The soul had multiple aspects — the ka (life force) and ba (personality). After death, these traveled beyond the veil to join in the afterlife.

## Global Folklore
- **Japanese Shinto & Buddhist Beliefs**: Obon festival celebrates the return of ancestral spirits to the living world; the veil is thin, and lanterns guide spirits home.
- **Mesoamerican Traditions**: In Aztec and modern Mexican Día de los Muertos celebrations, death is not an end but a crossing — the dead return to the world of the living for one night.
- **Native American Beliefs**: Many tribes speak of a spirit world existing alongside ours. Dreams, visions, and sacred sites act as portals through the veil.

## Literary & Spiritual Symbolism
- **The Veil as Mist or Curtain**: Often depicted as fog, mist, or an ethereal curtain between worlds.
- **Liminal Times**: Dawn, dusk, and certain seasons are considered times when the veil thins.
- **Veil as Consciousness Shift**: In mystical traditions, the veil isn't physical — it's the limits of human perception, lifted through meditation, trance, or ritual.

## Recurring Themes Across Cultures
- **The veil thins during festivals, solstices, equinoxes, or times of death/birth.**
- **Certain people (shamans, psychics, heroes) can cross or see through the veil.**
- **Crossing the veil often requires a price — emotional, spiritual, or physical.**
- **The veil protects the living from the overwhelming presence of the dead/spirit realm.**
- **It can be crossed accidentally (dreams, death experiences) or deliberately (rituals, magic).**

## Sources
- Celtic mythology and folklore
- Greek mythological texts (Homer, Ovid)
- Norse sagas and Eddas
- Egyptian Book of the Dead
- Various global cultural traditions
- Literary and spiritual interpretations`,
  source: 'AI Research Assistant',
  tags: ['mythology', 'death', 'spirituality', 'folklore', 'afterlife', 'celtic', 'greek', 'norse', 'egyptian', 'cultural traditions'],
  createdAt: Date.now(),
  lastModified: Date.now()
};

// Add the research entry to the book
if (!book.research) {
  book.research = [];
}
book.research.push(researchEntry);

// Update last modified timestamp
book.lastModified = Date.now();

// Save the updated book
fs.writeFileSync(bookPath, JSON.stringify(book, null, 2));

console.log('Research entry added successfully!');
console.log('Title:', researchEntry.title);
console.log('Tags:', researchEntry.tags.join(', '));
console.log('Research entries count:', book.research.length);

