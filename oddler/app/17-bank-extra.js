/**
 * Answer top-ups (2026-11-01). Players kept typing things that are plainly
 * true and getting a miss, so this file widens the long tail of the open-ended
 * prompts — the ones where no hand-written list can hold every real person,
 * song or film. Rows merge into the prompt that already exists; a key the
 * prompt already has is ignored, so nothing here can shadow or duplicate.
 *
 * Tiers: 1 plain · 2 too clever · 3 odd-ish · 4 rare · 5 deep cut · 6 one in an oddlion.
 * A late addition is usually obscure, so most of these sit at 4–6.
 */
EXTRA.push(
  ["nfl-qb",
    "Tyrod Taylor:4|Jake Delhomme:5|Josh Freeman:5|Blaine Gabbert:5|Davis Mills:5|Brock Osweiler:5|Colt McCoy:5|Dwayne Haskins:5|Josh Rosen:5|Trent Green:5|Kordell Stewart:5|Mark Rypien:5|Doug Williams:5|Archie Manning:5|Bernie Kosar:5|Matt Moore:6|Christian Ponder:6|EJ Manuel:6|Mike Glennon:6|Nathan Peterman:6|Matt Flynn:6|Scott Mitchell:6|Jay Fiedler:6|Elvis Grbac:6|Jeff Hostetler:6|Steve DeBerg:6|Dave Krieg:6|Tommy Maddox:6|Josh McCown:6|Ryan Mallett:6|Sean Mannion:6|Mason Rudolph:6|Jarrett Stidham:6|Cooper Rush:6|Jameis Winston:4|Carson Wentz:4|Mac Jones:4|Zach Wilson:4|Kenny Pickett:4"],

  ["nba-player",
    "Rudy Gobert:3|Jalen Brunson:3|Anthony Edwards:3|Tyrese Haliburton:3|Victor Wembanyama:3|Jimmy Butler:3|Paul Pierce:3|Ray Allen:3|Kevin Garnett:3|Steve Nash:3|Jason Kidd:3|Patrick Ewing:3|David Robinson:3|Karl Malone:3|John Stockton:3|Scottie Pippen:3|Dennis Rodman:3|Chris Webber:4|Alonzo Mourning:4|Domantas Sabonis:4|Gary Payton:4|Clyde Drexler:4|Dominique Wilkins:4|Grant Hill:4|Penny Hardaway:4|Shawn Kemp:4|Jrue Holiday:4|Khris Middleton:4|Julius Randle:4|Paolo Banchero:4|Chet Holmgren:4|Franz Wagner:4|Evan Mobley:4|Scottie Barnes:4|Vlade Divac:5|Zach Randolph:5|Bernard King:5|Dave Cowens:5|Willis Reed:5|Earl Monroe:5|Joe Dumars:5|Mitch Richmond:5|Glen Rice:5|Latrell Sprewell:5|Antoine Walker:5|Rashard Lewis:5|Michael Redd:5|Brandon Roy:5|Victor Oladipo:5|Sidney Moncrief:6|Dan Issel:6|Artis Gilmore:6|Bob Lanier:6|Nate Archibald:6|Alex English:6|Mark Aguirre:6|Jack Sikma:6|Chet Walker:6|Tyreke Evans:6"],

  ["nhl-player",
    "Cale Makar:3|Leon Draisaitl:3|Nikita Kucherov:3|Mitch Marner:3|Matthew Tkachuk:3|Andrei Vasilevskiy:3|Zdeno Chara:3|Carey Price:3|Marc-Andre Fleury:3|Quinn Hughes:4|Jack Hughes:4|Brady Tkachuk:4|William Nylander:4|Elias Pettersson:4|Kirill Kaprizov:4|Igor Shesterkin:4|Victor Hedman:4|Roman Josi:4|Aleksander Barkov:4|Jack Eichel:4|Artemi Panarin:4|Johnny Gaudreau:4|Mikko Rantanen:4|Jonathan Quick:4|Duncan Keith:4|Shea Weber:4|Drew Doughty:4|Erik Karlsson:4|Brent Burns:4|PK Subban:4|Adam Fox:5|Jake Guentzel:5|Sebastian Aho:5|Mika Zibanejad:5|Clayton Keller:5|Tim Stutzle:5|Dylan Larkin:5|Jason Robertson:5|Pekka Rinne:5|Ryan Miller:5"],

  ["pixar-character",
    "Merida:3|Riley:3|Anger:3|Elastigirl:3|Violet:3|Dash:3|Jack-Jack:3|Frozone:3|Edna Mode:3|Carl Fredricksen:3|Russell:3|Dug:3|Marlin:3|Crush:3|Boo:3|Sully=Sulley:3|Miguel:4|Luca:4|Bing Bong:4|Fear:4|Disgust:4|Anxiety:4|Coco:4|Hank:4|Bruce:4|Kevin:4|Flik:4|Randall:4|Roz:4|Syndrome:4|Doc Hudson:4|Sally:4|Linguini:4|Anton Ego:4|Joe Gardner:4|Mei Lee:4|Alberto:5|Ember:5|Ennui:5|Envy:5|Embarrassment:5|Hector:5|Dante:5|Gill:5|Destiny:5|Bailey:5|Hopper:5|Heimlich:5|Celia:5|Art:5|Chick Hicks:5|Cruz Ramirez:5|Jackson Storm:5|Colette:5|Skinner:5|Django:5|Emile:5|Auto:5|M-O:5|Barley:5|Ian:5|Ming Lee:5|Wade:6|Ernesto de la Cruz:6|Mama Imelda:6|Francis:6|Terri:6|The King:6|Captain McCrea:6|Moonwind:6|Laurel Lightfoot:6|Charles Muntz:6"],

  ["eminem-song",
    "The Real Slim Shady:1|My Name Is:1|The Way I Am:3|When I'm Gone:3|The Monster:3|Houdini:3|Beautiful:4|Like Toy Soldiers:4|Superman:4|Just Lose It:4|No Love:4|Headlights:4|River:4|Walk on Water:4|Killshot:4|Renegade:4|Shake That:5|Crack a Bottle:5|Space Bound:5|Survival:5|Lucky You:5|Darkness:5|Gnat:5|Tobey:5|Forever:5|Guts Over Fear:5|Role Model:5|Brain Damage:5|Legacy:6|Somebody Save Me:6"],

  ["number-title-film",
    "1917:3|8 Mile:3|21 Jump Street:3|12 Years a Slave:3|10 Things I Hate About You:3|Terminator 2:3|Spider-Man 2:3|Shrek 2:3|Toy Story 4:3|Iron Man 2:3|2 Fast 2 Furious:3|2012:4|Seven Samurai:4|Catch-22:4|22 Jump Street:4|127 Hours:4|28 Days Later:4|50 First Dates:4|13 Going on 30:4|500 Days of Summer:4|The Hateful Eight:4|Ocean's Twelve:4|Ocean's Thirteen:4|Die Hard 2:4|Air Force One:4|17 Again:5|9 to 5:5|Seven Pounds:5|Taken 2:5|Rocky II:5|Saw II:6"],

  ["shrek-character",
    "Dragon:3|Snow White:4|Cinderella:4|King Harold:4|Rumpelstiltskin:4|Robin Hood:4|Arthur:5|Humpty Dumpty:5|Kitty Softpaws:5|Merlin:5|Sleeping Beauty:5|Captain Hook:5|Queen Lillian:5|Monsieur Hood:6"],

  ["cereal",
    "Coco Pops:3|Muesli:3|Granola:3|Shredded Wheat:3|Frosties:3|Apple Jacks:3|Corn Pops:3|Cookie Crisp:3|Reese's Puffs:3|Alpen:4|Crunchy Nut:4|Golden Grahams:4|Honeycomb:4|Chex:4|Wheaties:4|All-Bran:4|Bran Flakes:4|Nesquik:4|Count Chocula:4|Kix:5|Total:5|Fiber One:5|Puffed Wheat:5|Sugar Puffs:5|Smacks:5|Boo Berry:5|Franken Berry:5|French Toast Crunch:5|Oreo O's:5|Weetos:6|Oatibix:6|Ricicles:6|Waffle Crisp:6"],

  ["mushroom",
    "Fly agaric:3|Death cap:3|Chestnut mushroom:4|Hen of the woods:4|Chicken of the woods:4|Puffball:4|Reishi:4|Cordyceps:4|Field mushroom:4|Shimeji:5|Matsutake:5|Bolete:5|Turkey tail:5|Black trumpet:5|Inky cap:5|Destroying angel:5|Shaggy mane:5|Parasol mushroom:5|Pioppino:6|Nameko:6|Russula:6|Hedgehog mushroom:6|Jelly ear:6|Blewit:6|Saffron milk cap:6"],

  ["berry",
    "Whitecurrant:5|Jostaberry:6|Pineberry:6|Beautyberry:6|Maqui berry:6|Camu camu:6|Riberry:6|Jujube:6"],

  ["dog-breed",
    "Portuguese Water Dog:4|Bluetick Coonhound:5|American Foxhound:5|Briard:5|Beauceron:5|Bouvier des Flandres:5|Leonberger:5|Spanish Water Dog:5|Jindo:5|Mudi:6|Pumi:6|Kooikerhondje:6|Otterhound:6|Sealyham Terrier:6|Skye Terrier:6|Glen of Imaal Terrier:6|Cesky Terrier:6|Azawakh:6|Sloughi:6|Chinook:6|Plott Hound:6|Treeing Walker Coonhound:6|Black and Tan Coonhound:6|Norwegian Lundehund:6|Finnish Lapphund:6|Swedish Vallhund:6|Barbet:6|Entlebucher:6|Appenzeller:6|Hovawart:6|Landseer:6|Tosa Inu:6|Kai Ken:6|Kishu Ken:6|Thai Ridgeback:6"],
);
