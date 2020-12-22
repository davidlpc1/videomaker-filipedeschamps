const imageDownloader = require('image-downloader')
const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
const state = require('./state.js');

const googleSearchCredentials = require('../credentials/google-search.json')

async function robot(){
    const content = state.load();
    await fetchImageOfAllSentences(content);
    await downloadAllImages(content);

    state.save(content)

    async function fetchImageOfAllSentences(content){
        for(const sentence of content.sentences){
            const query = `${content.searchTerm} ${sentence.keywords[0]}`
            sentence.images = await fetchGoogleAndReturnImagesLinks(query)
            
            sentence.googleSearchQuery = query;
        }
    }

    async function fetchGoogleAndReturnImagesLinks(query){
        const response = await customSearch.cse.list({
            auth:googleSearchCredentials.apiKey,
            cx:googleSearchCredentials.searchEngineId,
            q:query,
            searchType:'image',
            num:2,
        })

        const imagesUrl = response.data.items.map(item => item.link)

        return imagesUrl;
    }

    async function downloadAllImages(content){
        content.downloadedImages = [];

        for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
            const images = content.sentences[sentenceIndex].images;

            for(let imageIndex = 0; imageIndex < images.length; imageIndex++){
                const imageUrl = images[imageIndex];

                try {
                    if(content.downloadedImages.includes(imageUrl)){
                        throw new Error("Image already downloaded")
                    }

                    await downloadAndSave(imageUrl, `${sentenceIndex}-original.png`);
                    content.downloadedImages.push(imageUrl)
                    console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Image successfully downloaded: ${imageUrl}`)
                    break;
                }catch(error){
                    console.log(`> [image-robot] [${sentenceIndex}][${imageIndex}] Error (${imageUrl}): ${error}`)
                }
            }
        }
    }

    async function downloadAndSave(url, fileName){
        return imageDownloader.image({
            url, url,
            dest:`./content/${fileName}`,
        })
    }

}

module.exports = robot;