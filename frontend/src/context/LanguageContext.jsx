import { createContext, useContext, useState } from 'react'

export const LANGUAGES = {
  en: { label: 'English', short: 'EN' },
  hi: { label: 'हिंदी',   short: 'HI' },
  mr: { label: 'मराठी',   short: 'MR' },
}

// ── Full translation map ──────────────────────────────────────────────────────
// Key = exact English string used in JSX
// Each entry: { hi: '...', mr: '...' }
export const TRANSLATIONS = {
  // ── Sidebar ──
  'Core':                    { hi: 'मुख्य',                    mr: 'मुख्य' },
  'Analysis':                { hi: 'विश्लेषण',                 mr: 'विश्लेषण' },
  'AI':                      { hi: 'एआई',                      mr: 'एआय' },
  'Dashboard':               { hi: 'डैशबोर्ड',                 mr: 'डॅशबोर्ड' },
  'Smart Decision':          { hi: 'स्मार्ट निर्णय',           mr: 'स्मार्ट निर्णय' },
  'Sell Timing':             { hi: 'बेचने का समय',             mr: 'विक्री वेळ' },
  'Market Intelligence':     { hi: 'बाजार बुद्धिमत्ता',        mr: 'बाजार बुद्धिमत्ता' },
  'Crop Recommendation':     { hi: 'फसल सिफारिश',              mr: 'पीक शिफारस' },
  'Model Insights':          { hi: 'मॉडल अंतर्दृष्टि',         mr: 'मॉडेल अंतर्दृष्टी' },
  'AI Assistant':            { hi: 'एआई सहायक',                mr: 'एआय सहाय्यक' },

  // ── Navbar ──
  'System Online':           { hi: 'सिस्टम ऑनलाइन',           mr: 'सिस्टम ऑनलाइन' },
  'Crop Intelligence Platform': { hi: 'फसल बुद्धिमत्ता प्लेटफॉर्म', mr: 'पीक बुद्धिमत्ता व्यासपीठ' },
  'AgriIntel AI':            { hi: 'एग्रीइंटेल एआई',           mr: 'एग्रीइंटेल एआय' },

  // ── Dashboard ──
  'Dashboard':               { hi: 'डैशबोर्ड',                 mr: 'डॅशबोर्ड' },
  'System health, model status and crop quality scanner': { hi: 'सिस्टम स्वास्थ्य, मॉडल स्थिति और फसल गुणवत्ता स्कैनर', mr: 'सिस्टम आरोग्य, मॉडेल स्थिती आणि पीक गुणवत्ता स्कॅनर' },
  'Active Model':            { hi: 'सक्रिय मॉडल',              mr: 'सक्रिय मॉडेल' },
  'Primary inference':       { hi: 'प्राथमिक अनुमान',          mr: 'प्राथमिक अनुमान' },
  'CNN Status':              { hi: 'सीएनएन स्थिति',            mr: 'सीएनएन स्थिती' },
  'Food quality model':      { hi: 'खाद्य गुणवत्ता मॉडल',     mr: 'अन्न गुणवत्ता मॉडेल' },
  'Total Predictions':       { hi: 'कुल भविष्यवाणियां',        mr: 'एकूण अंदाज' },
  'Session count':           { hi: 'सत्र गणना',                mr: 'सत्र संख्या' },
  'Avg Confidence':          { hi: 'औसत विश्वास',              mr: 'सरासरी विश्वास' },
  'Last 10 calls':           { hi: 'अंतिम 10 कॉल',             mr: 'शेवटचे 10 कॉल' },
  'Crop Quality Scanner':    { hi: 'फसल गुणवत्ता स्कैनर',      mr: 'पीक गुणवत्ता स्कॅनर' },
  'CNN · cnn_food_quality_model.h5': { hi: 'सीएनएन · cnn_food_quality_model.h5', mr: 'सीएनएन · cnn_food_quality_model.h5' },
  'Crop Image':              { hi: 'फसल छवि',                  mr: 'पीक प्रतिमा' },
  'Upload image (JPEG / PNG)': { hi: 'छवि अपलोड करें (JPEG / PNG)', mr: 'प्रतिमा अपलोड करा (JPEG / PNG)' },
  'Analyze Crop':            { hi: 'फसल विश्लेषण करें',        mr: 'पीक विश्लेषण करा' },
  'Scanning...':             { hi: 'स्कैन हो रहा है...',       mr: 'स्कॅन होत आहे...' },
  'CNN analyzing image...':  { hi: 'सीएनएन छवि विश्लेषण कर रहा है...', mr: 'सीएनएन प्रतिमा विश्लेषण करत आहे...' },
  'Upload a crop image and click Analyze Crop': { hi: 'फसल छवि अपलोड करें और विश्लेषण करें', mr: 'पीक प्रतिमा अपलोड करा आणि विश्लेषण करा' },
  'Price Distribution':      { hi: 'मूल्य वितरण',              mr: 'किंमत वितरण' },
  'Model Accuracy Comparison': { hi: 'मॉडल सटीकता तुलना',     mr: 'मॉडेल अचूकता तुलना' },
  'AI Crop Analysis':        { hi: 'एआई फसल विश्लेषण',        mr: 'एआय पीक विश्लेषण' },
  'Freshness:':              { hi: 'ताजगी:',                   mr: 'ताजेपणा:' },
  'Confidence:':             { hi: 'विश्वास:',                 mr: 'विश्वास:' },
  'Decision:':               { hi: 'निर्णय:',                  mr: 'निर्णय:' },
  'STORE / SELL':            { hi: 'संग्रहीत करें / बेचें',    mr: 'साठवा / विका' },
  'DO NOT SELL':             { hi: 'मत बेचें',                 mr: 'विकू नका' },
  '===== Final System Output =====': { hi: '===== अंतिम सिस्टम आउटपुट =====', mr: '===== अंतिम सिस्टम आउटपुट =====' },
  'Freshness':               { hi: 'ताजगी',                    mr: 'ताजेपणा' },
  'Confidence':              { hi: 'विश्वास',                  mr: 'विश्वास' },
  'Agent Decision':          { hi: 'एजेंट निर्णय',             mr: 'एजंट निर्णय' },
  'Latency':                 { hi: 'विलंब',                    mr: 'विलंब' },
  'Model Version':           { hi: 'मॉडल संस्करण',             mr: 'मॉडेल आवृत्ती' },
  'CNN Confidence':          { hi: 'सीएनएन विश्वास',           mr: 'सीएनएन विश्वास' },
  'STORE':                   { hi: 'संग्रहीत करें',            mr: 'साठवा' },
  'DISCARD':                 { hi: 'त्यागें',                  mr: 'टाका' },

  // ── Sell Timing ──
  'Time-Series Graph':       { hi: 'समय-श्रृंखला ग्राफ',       mr: 'वेळ-मालिका आलेख' },
  'Intraday Price Trend':    { hi: 'इंट्राडे मूल्य प्रवृत्ति', mr: 'इंट्राडे किंमत कल' },
  'Recommendation':          { hi: 'सिफारिश',                  mr: 'शिफारस' },
  'Action Indicator':        { hi: 'क्रिया संकेतक',            mr: 'क्रिया निर्देशक' },
  'Best Window':             { hi: 'सर्वोत्तम विंडो',          mr: 'सर्वोत्तम विंडो' },
  'Worst Window':            { hi: 'सबसे खराब विंडो',          mr: 'सर्वात वाईट विंडो' },
  'Live Prediction':         { hi: 'लाइव भविष्यवाणी',          mr: 'थेट अंदाज' },
  'SELL / HOLD Signal from Model': { hi: 'मॉडल से SELL / HOLD संकेत', mr: 'मॉडेलकडून SELL / HOLD संकेत' },
  'Min Price (INR)':         { hi: 'न्यूनतम मूल्य (INR)',       mr: 'किमान किंमत (INR)' },
  'Max Price (INR)':         { hi: 'अधिकतम मूल्य (INR)',        mr: 'कमाल किंमत (INR)' },
  'Run Prediction':          { hi: 'भविष्यवाणी चलाएं',         mr: 'अंदाज चालवा' },
  'Predicting...':           { hi: 'भविष्यवाणी हो रही है...',  mr: 'अंदाज होत आहे...' },
  'AI predicting...':        { hi: 'एआई भविष्यवाणी कर रहा है...', mr: 'एआय अंदाज करत आहे...' },
  'Model Output':            { hi: 'मॉडल आउटपुट',              mr: 'मॉडेल आउटपुट' },
  'Raw value (1 = SELL, 0 = HOLD)': { hi: 'कच्चा मान (1 = बेचें, 0 = रोकें)', mr: 'कच्चे मूल्य (1 = विका, 0 = थांबा)' },
  'Model certainty score':   { hi: 'मॉडल निश्चितता स्कोर',     mr: 'मॉडेल निश्चितता स्कोर' },
  'Market Insight':          { hi: 'बाजार अंतर्दृष्टि',         mr: 'बाजार अंतर्दृष्टी' },
  'Price Range Analysis':    { hi: 'मूल्य सीमा विश्लेषण',       mr: 'किंमत श्रेणी विश्लेषण' },
  'Enter price range and run prediction to see the model signal.': { hi: 'मॉडल संकेत देखने के लिए मूल्य सीमा दर्ज करें।', mr: 'मॉडेल संकेत पाहण्यासाठी किंमत श्रेणी प्रविष्ट करा.' },
  'Explanation':             { hi: 'स्पष्टीकरण',               mr: 'स्पष्टीकरण' },
  'Why The Model Suggests This Action': { hi: 'मॉडल यह क्रिया क्यों सुझाता है', mr: 'मॉडेल हे का सुचवतो' },
  'Best sell window':        { hi: 'सर्वोत्तम बिक्री विंडो',   mr: 'सर्वोत्तम विक्री विंडो' },
  'Worst sell window':       { hi: 'सबसे खराब बिक्री विंडो',   mr: 'सर्वात वाईट विक्री विंडो' },

  // ── Crop Recommendation ──
  'AI Input Panel':          { hi: 'एआई इनपुट पैनल',           mr: 'एआय इनपुट पॅनेल' },
  'Crop Recommendation Engine': { hi: 'फसल सिफारिश इंजन',      mr: 'पीक शिफारस इंजिन' },
  'State':                   { hi: 'राज्य',                    mr: 'राज्य' },
  'Market':                  { hi: 'बाजार',                    mr: 'बाजार' },
  'Optional Crop':           { hi: 'वैकल्पिक फसल',             mr: 'पर्यायी पीक' },
  'Auto-select by AI':       { hi: 'एआई द्वारा स्वतः चुनें',   mr: 'एआयद्वारे स्वयं निवडा' },
  'AI analyzing...':         { hi: 'एआई विश्लेषण कर रहा है...', mr: 'एआय विश्लेषण करत आहे...' },
  'Analyze Recommendation':  { hi: 'सिफारिश विश्लेषण करें',    mr: 'शिफारस विश्लेषण करा' },
  'Output':                  { hi: 'आउटपुट',                   mr: 'आउटपुट' },
  'Recommendation Result':   { hi: 'सिफारिश परिणाम',           mr: 'शिफारस निकाल' },
  'Recommended Crop':        { hi: 'अनुशंसित फसल',             mr: 'शिफारस केलेले पीक' },
  'Predicted Profitability': { hi: 'अनुमानित लाभप्रदता',       mr: 'अंदाजे नफा' },
  'Expected Price Range':    { hi: 'अपेक्षित मूल्य सीमा',      mr: 'अपेक्षित किंमत श्रेणी' },
  'Why this recommendation': { hi: 'यह सिफारिश क्यों',         mr: 'ही शिफारस का' },
  'Select inputs and run analysis to generate recommendation output.': { hi: 'सिफारिश आउटपुट के लिए इनपुट चुनें।', mr: 'शिफारस आउटपुटसाठी इनपुट निवडा.' },

  // ── Market Intelligence ──
  'Cluster Scatter Visualization': { hi: 'क्लस्टर स्कैटर विज़ुअलाइज़ेशन', mr: 'क्लस्टर स्कॅटर व्हिज्युअलायझेशन' },
  'Market Segmentation by Demand vs Modal Price': { hi: 'मांग बनाम मोडल मूल्य द्वारा बाजार विभाजन', mr: 'मागणी विरुद्ध मोडल किंमतीनुसार बाजार विभाजन' },
  'Cluster Legend':          { hi: 'क्लस्टर लेजेंड',           mr: 'क्लस्टर लेजेंड' },
  '4 Market Clusters':       { hi: '4 बाजार क्लस्टर',          mr: '4 बाजार क्लस्टर' },
  'Insights Panel':          { hi: 'अंतर्दृष्टि पैनल',         mr: 'अंतर्दृष्टी पॅनेल' },
  'Cluster-Level Interpretation': { hi: 'क्लस्टर-स्तर व्याख्या', mr: 'क्लस्टर-स्तर अर्थ' },
  'ML Depth':                { hi: 'एमएल गहराई',               mr: 'एमएल खोली' },

  // ── Model Performance ──
  'Accuracy Comparison':     { hi: 'सटीकता तुलना',             mr: 'अचूकता तुलना' },
  'Model Accuracy Benchmark': { hi: 'मॉडल सटीकता बेंचमार्क',  mr: 'मॉडेल अचूकता बेंचमार्क' },
  'Best Model':              { hi: 'सर्वश्रेष्ठ मॉडल',         mr: 'सर्वोत्तम मॉडेल' },
  'Top Accuracy':            { hi: 'शीर्ष सटीकता',             mr: 'शीर्ष अचूकता' },
  'Short Insights':          { hi: 'संक्षिप्त अंतर्दृष्टि',    mr: 'संक्षिप्त अंतर्दृष्टी' },
  'Performance Interpretation': { hi: 'प्रदर्शन व्याख्या',     mr: 'कार्यप्रदर्शन अर्थ' },
  'Live API Comparison':     { hi: 'लाइव एपीआई तुलना',         mr: 'थेट एपीआय तुलना' },
  'Compare Models on Real Input': { hi: 'वास्तविक इनपुट पर मॉडल तुलना', mr: 'वास्तविक इनपुटवर मॉडेल तुलना' },
  'Compare All Models':      { hi: 'सभी मॉडल तुलना करें',      mr: 'सर्व मॉडेल तुलना करा' },
  'Running...':              { hi: 'चल रहा है...',             mr: 'चालू आहे...' },
  'Calling all 3 models...': { hi: 'सभी 3 मॉडल कॉल हो रहे हैं...', mr: 'सर्व 3 मॉडेल कॉल होत आहेत...' },
  'Prediction':              { hi: 'भविष्यवाणी',               mr: 'अंदाज' },
  'Confidence Comparison Chart': { hi: 'विश्वास तुलना चार्ट', mr: 'विश्वास तुलना चार्ट' },
  'Enter a price range and click Compare to run all 3 models simultaneously.': { hi: 'सभी 3 मॉडल चलाने के लिए मूल्य सीमा दर्ज करें।', mr: 'सर्व 3 मॉडेल चालवण्यासाठी किंमत श्रेणी प्रविष्ट करा.' },
  'CNN Image Analysis':      { hi: 'सीएनएन छवि विश्लेषण',     mr: 'सीएनएन प्रतिमा विश्लेषण' },
  'Crop Freshness Scanner':  { hi: 'फसल ताजगी स्कैनर',         mr: 'पीक ताजेपणा स्कॅनर' },
  'Scan Crop':               { hi: 'फसल स्कैन करें',           mr: 'पीक स्कॅन करा' },
  'Upload a crop image and click Scan to check freshness.': { hi: 'ताजगी जांचने के लिए फसल छवि अपलोड करें।', mr: 'ताजेपणा तपासण्यासाठी पीक प्रतिमा अपलोड करा.' },
  'Good condition for market.': { hi: 'बाजार के लिए अच्छी स्थिति।', mr: 'बाजारासाठी चांगली स्थिती.' },
  'Not suitable for sale.':  { hi: 'बिक्री के लिए उपयुक्त नहीं।', mr: 'विक्रीसाठी योग्य नाही.' },

  // ── Smart Decision ──
  'CNN + Web Search + ML + Generative AI Pipeline': { hi: 'सीएनएन + वेब खोज + एमएल + जनरेटिव एआई पाइपलाइन', mr: 'सीएनएन + वेब शोध + एमएल + जनरेटिव एआय पाइपलाइन' },
  'Smart Crop Decision Engine': { hi: 'स्मार्ट फसल निर्णय इंजन', mr: 'स्मार्ट पीक निर्णय इंजिन' },
  'Crop Name (optional)':    { hi: 'फसल का नाम (वैकल्पिक)',    mr: 'पिकाचे नाव (पर्यायी)' },
  'Improves live market price accuracy': { hi: 'लाइव बाजार मूल्य सटीकता बढ़ाता है', mr: 'थेट बाजार किंमत अचूकता सुधारते' },
  'Analyzing...':            { hi: 'विश्लेषण हो रहा है...',    mr: 'विश्लेषण होत आहे...' },
  'Decision Result':         { hi: 'निर्णय परिणाम',            mr: 'निर्णय निकाल' },
  'CNN Analysis':            { hi: 'सीएनएन विश्लेषण',          mr: 'सीएनएन विश्लेषण' },
  'Classifying crop freshness from image...': { hi: 'छवि से फसल ताजगी वर्गीकृत हो रही है...', mr: 'प्रतिमेतून पीक ताजेपणा वर्गीकृत होत आहे...' },
  'Market Price Fetch':      { hi: 'बाजार मूल्य प्राप्ति',     mr: 'बाजार किंमत मिळवणे' },
  'Fetching live crop prices via web search...': { hi: 'वेब खोज से लाइव फसल मूल्य प्राप्त हो रहे हैं...', mr: 'वेब शोधाद्वारे थेट पीक किंमती मिळवत आहे...' },
  'ML Prediction':           { hi: 'एमएल भविष्यवाणी',          mr: 'एमएल अंदाज' },
  'Running price model for SELL / HOLD signal...': { hi: 'SELL / HOLD संकेत के लिए मूल्य मॉडल चल रहा है...', mr: 'SELL / HOLD संकेतासाठी किंमत मॉडेल चालवत आहे...' },
  'AI Narrative':            { hi: 'एआई कथा',                  mr: 'एआय कथन' },
  'Generating analysis report...': { hi: 'विश्लेषण रिपोर्ट तैयार हो रही है...', mr: 'विश्लेषण अहवाल तयार होत आहे...' },
  'Estimated Market Price':  { hi: 'अनुमानित बाजार मूल्य',     mr: 'अंदाजे बाजार किंमत' },
  'Live web search':         { hi: 'लाइव वेब खोज',             mr: 'थेट वेब शोध' },
  'Dataset median (fallback)': { hi: 'डेटासेट माध्यिका (फॉलबैक)', mr: 'डेटासेट मध्यक (फॉलबॅक)' },
  'AI Generated':            { hi: 'एआई जनित',                 mr: 'एआय निर्मित' },
  'Analysis Report':         { hi: 'विश्लेषण रिपोर्ट',         mr: 'विश्लेषण अहवाल' },
  'Upload a crop image and click Analyze Crop.': { hi: 'फसल छवि अपलोड करें और विश्लेषण करें।', mr: 'पीक प्रतिमा अपलोड करा आणि विश्लेषण करा.' },
  'Prices are fetched automatically — no manual input needed.': { hi: 'मूल्य स्वचालित रूप से प्राप्त होते हैं।', mr: 'किंमती आपोआप मिळवल्या जातात.' },
  'Upload crop image (JPEG / PNG)': { hi: 'फसल छवि अपलोड करें (JPEG / PNG)', mr: 'पीक प्रतिमा अपलोड करा (JPEG / PNG)' },

  // ── AI Assistant ──
  'Powered by Groq · LLaMA 3.3 70B · Free Tier': { hi: 'Groq द्वारा संचालित · LLaMA 3.3 70B', mr: 'Groq द्वारे चालवलेले · LLaMA 3.3 70B' },
  'Clear chat':              { hi: 'चैट साफ करें',             mr: 'चॅट साफ करा' },
  'Chat cleared. How can I help you?': { hi: 'चैट साफ हो गई। मैं आपकी कैसे मदद कर सकता हूं?', mr: 'चॅट साफ झाली. मी तुम्हाला कशी मदत करू?' },
  'Suggested questions':     { hi: 'सुझाए गए प्रश्न',          mr: 'सुचवलेले प्रश्न' },
  'Image will be sent with your next message': { hi: 'छवि आपके अगले संदेश के साथ भेजी जाएगी', mr: 'प्रतिमा तुमच्या पुढील संदेशासह पाठवली जाईल' },
  'Ask about crop markets, sell timing, price analysis...': { hi: 'फसल बाजार, बेचने का समय, मूल्य विश्लेषण के बारे में पूछें...', mr: 'पीक बाजार, विक्री वेळ, किंमत विश्लेषणाबद्दल विचारा...' },
  'Enter to send · Shift+Enter for new line · 📎 attach image for context': { hi: 'भेजने के लिए Enter · नई लाइन के लिए Shift+Enter', mr: 'पाठवण्यासाठी Enter · नवीन ओळीसाठी Shift+Enter' },
}

// ── Context ───────────────────────────────────────────────────────────────────
const LanguageContext = createContext({ lang: 'en', setLang: () => {} })

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en')
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

// Translate a single string
export function t(str, lang) {
  if (lang === 'en' || !str) return str
  return TRANSLATIONS[str]?.[lang] ?? str
}
