// dependencies
const fs = require('fs')
const puppeteer = require('puppeteer');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');


//change this value to the number corresponding to game id of show page which you wish to scrape.
const game_id = 3709;


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

        //grab the round tables.
        

        console.log("Attempting to scrape contestants");
        Csvrow.contestantReference = await page.evaluate( () => {
            let elements = document.getElementsByClassName("contestants");
            return Array.from(elements).map( (el) => {
                let str = el.innerHTML;
                let startIndex = str.indexOf(">");            
                let endIndex = str.lastIndexOf("<");
                let contestantFullName = str.slice(startIndex+1, endIndex);
                let jobStart = str.lastIndexOf(">");
                let job = str.slice(jobStart+1); 
                return {
                    "fullContestant":el.innerHTML,
                    "contestantFullName": contestantFullName,
                    "contestant": contestantFullName.split(" ")[0],
                    "job": job
                }
            })
        });

        console.log("Attempting to scrape categories");
        categories = await page.evaluate(() => {
            let elements = document.getElementsByClassName("category_name");
            return Array.from(elements).map( (el) => { return {"category":el.innerHTML,"round":"undef.","col":"undef"}} );
        });
        for(let n = 0; n < categories.length; n++) {
            if( n <= 5 ) {
                categories[n]["round"] = "J";
                categories[n]["col"] = (n+1);
            }
            else if( n <= 11 ) {
                categories[n]["round"] = "DJ";
                categories[n]["col"] = ((n%1)+1);
            }
            else {
                categories[n]["round"] = "FJ";
            }
        }
        let round1categories = categories.filter( (value, index, array) => value["round"] == "J");
        //console.log("J cats: " , round1categories);
        //console.log("J cats length: ", round1categories.length);
        let round2categories = categories.filter( (value, index, array) => value["round"] == "DJ");
        //console.log("DJ cats: " , round2categories);
        let finalcategories = categories.filter( (value, index, array) => value["round"] == "FJ");
        //console.log("Final: ", finalcategories);

        console.log("Attempting to scrape clues");
        clues = await page.evaluate(()=> {
            let elements = document.getElementsByClassName("clue_text");
            return Array.from(elements).map( (el) => { return {"location":el.id,"clue":el.innerHTML}} );
        });      
        //console.log("Clues retrieved: ", clues);

        console.log("Putting clues into csvRowArray, parsing them, assigning categories.");
        for(let y = 0; y < clues.length; y++ ) {
            //fills csvrow objects with correct 
            //console.log("y = ", y);
            csvrows[y] = new Csvrow();
            csvrows[y].loadClue(clues[y]);
            //console.log("csvrow[y] BEFORE ", csvrows[y]);
            if( csvrows[y].round == "J" ) {
                csvrows[y].category = round1categories[csvrows[y].col-1].category;
                //console.log("round1categories[y].category", round1categories[csvrows[y].col-1].category);
            }   
            else if( csvrows[y].round == "DJ") {
                csvrows[y].category = round2categories[csvrows[y].col-1].category;
                //console.log("round2categories[y].category", round2categories[csvrows[y].col-1].category);
            }   
            else {
                csvrows[y].category = finalcategories[0].category;               
            }
            //console.log("csvrow[y] AFTER",csvrows[y]);
        }



        //flip all the cards
        console.log("Attempting to mouse-over cards to flip and expose answers.");
        await page.evaluate(() => {
            let ch = document.getElementsByClassName("clue_header");
            for(let i = 0; i < ch.length; i++) {
                ch[i].parentNode.onmouseover();
            }            
        });
        await page.evaluate(() => {
            let cats = document.getElementsByClassName("category_name");
            cats[12].parentElement.parentElement.parentElement.parentElement.onmouseover(); 
        });

        console.log("Attempting to scrape answers.");
        answers = await page.evaluate( () => {
            return Array.from(document.getElementsByClassName("correct_response")).map( (elem) => { return {"location":elem.parentNode.id, "answer":elem.innerHTML}} );
        });
        Csvrow.fillAnswers(answers, csvrows);

        console.log("Attempting to scrape correct contestants.");
        correctContestants = await page.evaluate( () => {
            return Array.from(document.getElementsByClassName("right")).map( (elem) => {
                return {"location":elem.parentNode.parentNode.parentNode.parentNode.id,"contestant":elem.innerHTML}} );
        });
        console.log("Attempting to scrape incorrect contestants.");
        incorrectContestants = await page.evaluate( () => {
            return Array.from(document.getElementsByClassName("wrong")).map( (elem) => {
                return {"location":elem.parentNode.parentNode.parentNode.parentNode.id,"contestant":elem.innerHTML}} ).filter( (elem) => { return elem.contestant === "Triple Stumper"});
        });

        console.log("Joining correct contestants and Triple Stumpers");
        let concatContestants = correctContestants.concat(incorrectContestants);
        console.log("Filling csvrows with corresponding contestants");
        Csvrow.fillContestants(concatContestants, csvrows);

        console.log("Saving file.");
        saveFile(saveLocation, bigstring);
        console.log("saved as " + savelocation);

        await browser.close();
        console.log("Browser closed");
    })()
} catch(err) {
    console.log("There was an error scraping!");
    console.error(err);
}
// holds clues, answers, and values
class jSquare {
    constructor() {
        this.clue = "";
        this.answer = "";
        this.value = 0;
        this.contestant = []; //contestants who answered correct; will be an array of 1 or 0 except for FJ
    }
}
//holds jsquares, category name, and column index of that category, 0-5
class jCategory {
    constructor() {
        this.name = "";
        this.index = 0;
        this.jSquares = [];
    }
}
// holds jcategories and round name
class jRound {
    constructor() {
        this.name = ""; //should be SJ, DJ, or FJ
        this.jCategories = [];
    }
}
// holds shownumber, showdate, jRounds and jContestants
class jGame {
    constructor(showname) {
        this.showName = showname;
        this.jRounds = [];
        this.jContestants = [];
    }
}
// holds fullname of contestant, shortname of contestant, their job, their winnings
class jContestant {
    constructor() {
        this.fullName = "unamed";
        this.shortname = "shortname";
        this.job = "a something";
        this.winnings = 0;
    }
}

//path is the save path, bigstring is all the .csv data
function saveFile(path, bigstring) {
    try {
        fs.writeFileSync(path, bigstring);
    }
    catch(ex) {
        console.log("Error writing file! ", ex);
    } 
}

console.log("Scraping complete.");