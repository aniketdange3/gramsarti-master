/**
 * CACHE UTILITY - मेमरी कॅशे व्यवस्थापन (Memory Cache Management)
 * 
 * या फाईलमध्ये मालमत्ता डेटा मेमरीमध्ये जतन करण्यासाठी फक्शन्स आहेत.
 * यामुळे डेटाबेसवरील ताण कमी होतो आणि रिपोर्ट जलद लोड होतात.
 */

let propertiesCache = null;
let propertiesEtag = null;

/**
 * Get cached properties data
 * मेमरीमधून मालमत्ता डेटा मिळवणे (Retrieve Data from Memory)
 */
const getPropertiesCache = () => propertiesCache;

/**
 * Get current ETag for caching
 * डेटा अपडेट झाल्याची माहिती मिळवणे (Retrieve current ETag)
 */
const getPropertiesEtag = () => propertiesEtag;

/**
 * Set and update properties cache
 * डेटा मेमरीमध्ये साठवणे (Store data in memory)
 */
const setPropertiesCache = (data) => {
    propertiesCache = data;
    // नवीन ETag तयार करणे (Generate new ETag)
    propertiesEtag = `W/"${Date.now()}-${data.length}"`;
    return propertiesEtag;
};

/**
 * Clear and invalidate the cache
 * डेटाबेसमधील बदलानुसार मेमरी रिकामी करणे (Clear memory when database updates)
 */
const clearPropertiesCache = () => {
    propertiesCache = null;
    propertiesEtag = null;
    console.log('[CACHE] Properties cache invalidated (Global Cleanup).');
};

module.exports = {
    getPropertiesCache,
    getPropertiesEtag,
    setPropertiesCache,
    clearPropertiesCache
};
