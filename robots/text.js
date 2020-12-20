const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey;
const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apikey
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

const nlu = new NaturalLanguageUnderstandingV1({
    iam_apikey: watsonApiKey,
    version: '2018-04-05',
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
});

const state = require('../robots/state.js');

function error(err,nameFunction) {
    console.error(`Erro em ${nameFunction} >>`)
    console.error(err)
    throw err;
}

async function robot(){
    const content = state.load();

    await fetchContentFromWikipedia(content);
    sanitizateContent(content);
    breakContentIntoSentences(content);
    limitMaximumSentences(content);
    await fetchKeywordsOfAllSentences(content);

    state.save(content);
    async function fetchContentFromWikipedia(content){
        try{
            const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
            const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2')
            const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm)
            const wikipediaContent = wikipediaResponse.get()
            
            content.sourceContentOriginal = wikipediaContent.content;
        }catch(err){
            error(err,'fetchContentFromWikipedia')
        }
    }

    // ===================================================

    function sanitizateContent(content){
        const withoutBlankLinesAndMarkdowns = removeBlankLinesAndMarkdowns(content.sourceContentOriginal);
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdowns)

        content.sourceContentSanitized = withoutDatesInParentheses;

        function removeBlankLinesAndMarkdowns(text){
            const allLines = text.split('\n');
            
            const withoutBlankLinesAndMarkdowns = allLines.filter(
                line =>  !(
                    line.trim().length === 0    || 
                    line.trim().startsWith("=")
                )
            )

            return withoutBlankLinesAndMarkdowns.join(' ');
        }

        function removeDatesInParentheses(text){
            return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ');
        }
    }

    // ===================================================

    function breakContentIntoSentences(content){
        content.sentences = [];

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)

        sentences.forEach(sentence => 
            content.sentences.push({
                text: sentence,
                keywords:[],
                images:[],
            })
        );
    }

    // ========================================================
    
    function limitMaximumSentences(content){
        content.sentences = content.sentences.slice(0, content.maximumSentences)
    }

    // ===========================================

    async function fetchKeywordsOfAllSentences(content){
        for(const sentence of content.sentences){
            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)
        }
    }

    // =====================================================

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise((resolve, reject) => {  
            nlu.analyze({
                text:sentence,
                features:{
                    keywords: {}
                }
            }, (error,response) => {
                if(error) error(error,'fetchWatsonAndReturnKeywords')

                const keywords = response.keywords.map(keyword => keyword.text )

                resolve(keywords)
            }) 
        })
    }

    // END OF TEXT ROBOT
}

module.exports = robot;