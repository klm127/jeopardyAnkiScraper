# jeopardyAnkiScraper
Scrapes j-archive with puppeteer for jeopardy questions and puts them in a .csv format usable by the flashcard program Anki for the purposes of fun trivia cards.

![anki screenshot](/screenshots/ankiscreen.png)

### setting up

Have npm installed.
Have Anki installed.

Use git clone https://github.com/klm127/jeopardyAnkiScraper.git to create the directory.

Run npm install from the root directory. This will install puppeteer and other dependencies. I am not including the dependencies pre-packaged for now to keep the repo size down. 

### select a game to turn into flashcards

<ol>
<li> Go to j-archive.org to see the many jeopardy games archived there. When you see the one you are interested in, make note of the "game_id" parameter in the url. 
![urlbar](/screenshots/urlbar.png)
</li>
<li>Copy the game_id value from the url to line 5 of index.js for the variable SHOWNUMBER (a misnomer - game_id and shownumber are not the same. To be corrected later). This will direct the scraper to scrape that webpage for jeopardy questions, answers, question values, and contestants.
![line5](/screenshots/line5.png)
</li>
</ol>

### execute scraping
To execute the program, run:
`node index.js`
from the directory.

A new file .csv will appear in your directory ending with the game_id you selected for targetting.

### import into anki

Once anki is installed, double click Jeopardy.apkg. This will import an anki deck which includes jeopardy clue style formatting. The anki file starts out with a few hundred jeopardy cards already in it. Anki will not add duplicates.

Press ctrl+shift+i to open the import menu in anki.

Select the csv you created.

### todo:

- fix scraping so csv is correct
- finish import instructions
- refactor variables in index.js
- consider an interface for better show selection
- improve the CSS and styling of jeopardy cards

### long term:

What I would like to turn this project in to is a big database of all jeopardy clues. Custom games should be able to be created for a category like, say "fine art" or "opera". Algorithms would parse different jeopardy category names to figure out which ones are related in broader categories. All kinds of interesting statistical analysis could also be performed to see what categories contestants perform well on, how that's changed over time, and many other interesting metrics. 