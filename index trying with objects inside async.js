// dependencies
const fs = require('fs')
const puppeteer = require('puppeteer');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');


//change this value to the number corresponding to game id of show page which you wish to scrape.
const game_id = 2539;


// build the url from the game id
const url = "http://www.j-archive.com/showgame.php?game_id=" + game_id;
// this is where .csv files will be saved.
const saveLocation = "rounds\jeopardy-round" + game_id + ".csv"; 

/** this try/async block uses puppeteer to scrape the given url */
try {
    (async () => {
        //instruct puppeteer to go to the webpage of the game.
        const browser = await puppeteer.launch();
        console.log("Browser loaded");
        const page = await browser.newPage();
        console.log("Page loaded");
        await page.goto(url);
        console.log("Page went to url", url);        
        console.log("Attempting to scrape show");
        //grab the single jeopardy round.
        let singleJelement = await page.evaluate( () => {
            class jRound {
                constructor() {
                    this.round = "SJ";
                    this.categories = [];
                    this.row1
                    this.clues = [[]];
                }
                parseCategories(round) {
                    let catelems = round.getElementsByClassName("category_name");
                    for(let i = 0; i < catelems.length; i++) {
                        this.categories[i] = catelems[i].innerHTML;
                    }
                }
                parseRow(index, row) {
                    function parseClue(clueElement) {
                        var newClue = ["0","none","blank","blank"] //{orderNumber:"0",correct:"None",clue:"blank",answer:"blank"};
                        try {
                            newClue[0] = clueElement.getElementsByClassName("clue_order_number").childNodes[0].innerHTML;
                        } catch(e) {
                        }
                        return newClue;
                    }
                    let clueboxes = row.getElementsByClassName("clue");
                    for(let i = 0; i < clueboxes.length; i++) {
                        this.clues[index][i] = parseClue(clueboxes[i]);
                    }
                }

            }
            jr = new jRound();
            let round = document.getElementById("jeopardy_round").childNodes[3].childNodes[1]; //brings us into the <tbody> element - children are rows
            jr.parseCategories(round);
            let values200 = round.childNodes[2]; //200 dollar clue row
            jr.parseRow(0,values200);
            let values400 = round.childNodes[4]; //400 dollar clue row
            let values600 = round.childNodes[6]; //600 dollar clue row
            let values800 = round.childNodes[8]; //800 dollar clue row
            let values1000 = round.childNodes[10]; //1000 dollar clue row
            return jr;
        });
        console.log(singleJelement);
        await browser.close();
    })()
} catch(err) {
    console.log("There was an error scraping!");
    console.error(err);
}

