// biome-ignore format: compact word list
const ADJECTIVES = [
  'Able', 'Agile', 'Airy', 'Alert', 'Amber', 'Ample', 'Arctic', 'Artful',
  'Astral', 'Avid', 'Azure', 'Balmy', 'Bold', 'Brave', 'Breezy', 'Bright',
  'Brisk', 'Bubbly', 'Buoyant', 'Busy', 'Calm', 'Candid', 'Careful', 'Casual',
  'Cheery', 'Chill', 'Civic', 'Classic', 'Clever', 'Cloudy', 'Coastal',
  'Cosmic', 'Cozy', 'Crafty', 'Crisp', 'Curious', 'Daring', 'Dapper',
  'Dashing', 'Dazzling', 'Deft', 'Devoted', 'Dreamy', 'Driven', 'Dusky',
  'Dynamic', 'Eager', 'Earnest', 'Easy', 'Electric', 'Elegant', 'Epic', 'Even',
  'Exact', 'Fabled', 'Fair', 'Faithful', 'Fancy', 'Fearless', 'Festive',
  'Fiery', 'Fine', 'Firm', 'Fleet', 'Fluent', 'Fluffy', 'Focused', 'Fond',
  'Frank', 'Free', 'Fresh', 'Friendly', 'Frosty', 'Frugal', 'Funky', 'Gallant',
  'Gentle', 'Genuine', 'Gifted', 'Giddy', 'Gilded', 'Glad', 'Gleaming',
  'Glossy', 'Golden', 'Graceful', 'Grand', 'Grateful', 'Hardy', 'Hasty',
  'Hazy', 'Hearty', 'Helpful', 'Heroic', 'Honest', 'Hopeful', 'Humble', 'Icy',
  'Ideal', 'Jaunty', 'Jolly', 'Jovial', 'Joyful', 'Jubilant', 'Keen', 'Kind',
  'Kindly', 'Lively', 'Loyal', 'Lucid', 'Lucky', 'Lunar', 'Lush', 'Magic',
  'Majestic', 'Mellow', 'Merry', 'Mighty', 'Mild', 'Misty', 'Modest', 'Mossy',
  'Nifty', 'Nimble', 'Noble', 'Nomadic', 'Novel', 'Oaken', 'Open', 'Optimal',
  'Orbital', 'Patient', 'Peppy', 'Perky', 'Placid', 'Playful', 'Plucky',
  'Plush', 'Poised', 'Polar', 'Polished', 'Prime', 'Proud', 'Prudent',
  'Punchy', 'Quick', 'Quiet', 'Quirky', 'Radiant', 'Rapid', 'Rare', 'Ready',
  'Regal', 'Robust', 'Rosy', 'Royal', 'Rugged', 'Rustic', 'Sage', 'Salty',
  'Sandy', 'Savvy', 'Scenic', 'Serene', 'Sharp', 'Shiny', 'Silent', 'Silky',
  'Silver', 'Simple', 'Sleek', 'Smart', 'Smooth', 'Snappy', 'Snowy', 'Snug',
  'Solar', 'Solid', 'Sonic', 'Sound', 'Sparkly', 'Speedy', 'Spicy', 'Spirited',
  'Splendid', 'Spry', 'Stable', 'Stately', 'Steady', 'Stellar', 'Stoic',
  'Stormy', 'Sturdy', 'Sublime', 'Sunny', 'Super', 'Supple', 'Sure', 'Swift',
  'Tactful', 'Tidy', 'Tender', 'Thrifty', 'Timely', 'Tranquil', 'Trusty',
  'Twinkly', 'Upbeat', 'Urban', 'Valiant', 'Velvet', 'Vibrant', 'Vivid',
  'Warm', 'Wavy', 'Whimsical', 'Wild', 'Willing', 'Windy', 'Winged', 'Wise',
  'Witty', 'Woolly', 'Worthy', 'Zany', 'Zealous', 'Zesty', 'Zippy', 'Amiable',
  'Blissful', 'Bouncy', 'Charming', 'Chipper', 'Cordial', 'Crimson', 'Dandy',
  'Elated', 'Exotic', 'Flashy', 'Fuzzy', 'Glowing', 'Groovy', 'Handy',
  'Honeyed', 'Inventive', 'Jazzy', 'Lofty', 'Marvelous', 'Measured', 'Natty',
  'Peachy', 'Pristine', 'Quaint', 'Rhythmic', 'Sincere', 'Spotless',
  'Sprightly', 'Starry', 'Stylish', 'Sunlit', 'Tireless', 'Tropical', 'Unique',
  'Verdant', 'Vital', 'Wondrous',
] as const;

// biome-ignore format: compact word list
const FIRST_NAMES = [
  'Aaron', 'Abby', 'Ada', 'Adam', 'Adrian', 'Aiden', 'Aisha', 'Alan', 'Alex',
  'Alice', 'Amara', 'Amelia', 'Amir', 'Amy', 'Ana', 'Andre', 'Angela', 'Anna',
  'Arjun', 'Ava', 'Ben', 'Bianca', 'Blake', 'Bruno', 'Caleb', 'Camila', 'Carl',
  'Carlos', 'Caroline', 'Chen', 'Chloe', 'Chris', 'Clara', 'Cole', 'Daisy',
  'Dan', 'Dana', 'Daniel', 'Dante', 'David', 'Diana', 'Diego', 'Dylan', 'Elena',
  'Eli', 'Elias', 'Ella', 'Emil', 'Emily', 'Emma', 'Eric', 'Erin', 'Ethan',
  'Eva', 'Evan', 'Felix', 'Fiona', 'Finn', 'Freya', 'Gabriel', 'Gemma',
  'George', 'Grace', 'Hana', 'Hannah', 'Harper', 'Harry', 'Hassan', 'Hazel',
  'Hector', 'Henry', 'Hugo', 'Ian', 'Ida', 'Iris', 'Isaac', 'Isabel', 'Ivan',
  'Ivy', 'Jack', 'Jade', 'James', 'Jamie', 'Jana', 'Jasper', 'Jay', 'Jenna',
  'Jin', 'Joel', 'John', 'Jonas', 'Jordan', 'Jose', 'Julia', 'Julian', 'June',
  'Kai', 'Kara', 'Karim', 'Kate', 'Kenji', 'Kevin', 'Kim', 'Kira', 'Kyle',
  'Lana', 'Lara', 'Laura', 'Leah', 'Leo', 'Leon', 'Liam', 'Lily', 'Lina',
  'Logan', 'Lola', 'Lucas', 'Lucy', 'Luis', 'Luka', 'Luna', 'Maya', 'Maria',
  'Marco', 'Mark', 'Marta', 'Mateo', 'Max', 'Maxine', 'Mia', 'Mila', 'Miles',
  'Milo', 'Mina', 'Mira', 'Nadia', 'Nancy', 'Naomi', 'Nate', 'Nia', 'Nico',
  'Nina', 'Noah', 'Nora', 'Oliver', 'Olivia', 'Omar', 'Oscar', 'Owen', 'Paige',
  'Paolo', 'Paul', 'Pedro', 'Penny', 'Peter', 'Pia', 'Priya', 'Quinn',
  'Rafael', 'Rania', 'Ravi', 'Rex', 'Rhea', 'Riley', 'Rita', 'Rosa', 'Rose',
  'Ruby', 'Ryan', 'Sam', 'Sara', 'Sasha', 'Sean', 'Selin', 'Seth', 'Shira',
  'Simon', 'Sofia', 'Sophie', 'Stella', 'Tara', 'Tess', 'Theo', 'Tina', 'Tom',
  'Tyler', 'Uma', 'Vera', 'Victor', 'Wade', 'Wendy', 'Will', 'Xavier', 'Yara',
  'Yuki', 'Yusuf', 'Zara', 'Zane', 'Zoe', 'Ahmet', 'Ayla', 'Berk', 'Can',
  'Deniz', 'Ege', 'Elif', 'Emre', 'Kerem', 'Mert', 'Asha', 'Bella', 'Brooke',
  'Cara', 'Cyrus', 'Dara', 'Ezra', 'Faye', 'Gia', 'Hiro', 'Ines', 'Jonah',
  'Kofi', 'Lena', 'Mae', 'Nell', 'Ola', 'Pablo', 'Sven', 'Tariq', 'Ulla',
  'Vince', 'Wren', 'Yasmin', 'Zack', 'Aria', 'Beau', 'Cleo', 'Dex', 'Enzo',
  'Flora', 'Gus', 'Hope', 'Imani', 'Juno', 'Kenzo', 'Lars', 'Malik', 'Nils',
  'Orla', 'Pierre', 'Remy', 'Saoirse', 'Tobias', 'Ugo', 'Valentina', 'Wanda',
] as const;

const FNV_OFFSET_BASIS = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: FNV-1a is defined bitwise
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // biome-ignore lint/suspicious/noBitwiseOperators: coerce to unsigned 32-bit
  return hash >>> 0;
}

/** Deterministic, human-friendly pseudonym ("Brave Nora") for an opaque id. */
export function getDisplayName(id: string): string {
  if (!id) {
    return 'Anonymous';
  }
  const hash = fnv1a32(id);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const firstName =
    FIRST_NAMES[Math.floor(hash / ADJECTIVES.length) % FIRST_NAMES.length];
  return `${adjective} ${firstName}`;
}
