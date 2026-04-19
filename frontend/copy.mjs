import fs from 'fs';
import path from 'path';

const src = "C:\\Users\\Jaat_pirate\\.gemini\\antigravity\\brain\\54afd960-329f-46d4-a529-1ffeb507d76a\\media__1776560577173.png";
const dest = path.join(process.cwd(), 'public', 'logo-circle.png');

fs.copyFileSync(src, dest);
console.log("Copied!");
