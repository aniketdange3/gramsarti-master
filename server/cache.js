/**
 * SHARED CACHE UTILITY - मालमत्ता डेटा कॅशे व्यवस्थापन (Property Data Cache Management)
 * 
 * हा मॉड्यूल मालमत्तांच्या मोठ्या डेटा संचाला मेमरीमध्ये कॅशे करतो, 
 * जेणेकरून 'नमुना ८' आणि 'नमुना ९' सारख्या रिपोर्ट्ससाठी वारंवार होणाऱ्या 
 * डेटाबेरी क्वेरीज टाळल्या जातात.
 */

let propertiesCache = null;
let propertiesEtag = null;

const getPropertiesCache = () => propertiesCache;
const getPropertiesEtag = () => propertiesEtag;

const setPropertiesCache = (data) => {
    propertiesCache = data;
    propertiesEtag = `W/"${Date.now()}-${data.length}"`;
    return propertiesEtag;
};

const clearPropertiesCache = () => {
    propertiesCache = null;
    propertiesEtag = null;
    console.log('[CACHE] Properties cache invalidated (Global).');
};

module.exports = {
    getPropertiesCache,
    getPropertiesEtag,
    setPropertiesCache,
    clearPropertiesCache
};
