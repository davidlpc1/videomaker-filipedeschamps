const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey;
const sentenceBoundaryDetection = require('sbd')

function error(err,nameFunction) {
    console.error(`Erro em ${nameFunction} >>`)
    console.error(err)
}

async function robot(content){
    await fetchContentFromWikipedia(content);
    sanitizateContent(content);
    breakContentIntoSentences(content);


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
}

module.exports = robot;