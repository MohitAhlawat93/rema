// Short, grounded conversational replies that remain useful when the external AI
// provider is unavailable. Never infer sensitive personal details or availability.
export function visitorReply(text, language = 'en', site = {}) {
  const q = String(text || '').toLowerCase();
  const hi = language === 'hi' || /[\u0900-\u097f]/.test(q);
  const choose = (en, hindi, href = '') => ({ answer: hi ? hindi : en, href });
  if (/(?:\b(?:hot|beautiful|pretty|gorgeous|attractive|sexy|cute|good looking|looks|look like|appearance)\b|हॉट|सुंदर|खूबसूरत|कैसी दिखती|कैसी लगती)/iu.test(q)) {
    return choose("That's a matter of personal taste 😊 Have a look at Lema's gallery and see what you think. I can help you find more about her personality too.",
      'खूबसूरती हर किसी की अपनी पसंद होती है 😊 Lema की तस्वीरें Gallery में देखिए और खुद तय कीजिए।', '/gallery/');
  }
  if (/(?:\b(?:alone|one.on.one|one to one|just (?:me|us|the two of us)|meet privately|private meeting|only with me|by ourselves|akele|akela|private time)\b|अकेले|अकेली|प्राइवेट मिल|निजी मुलाकात)/iu.test(q)) {
    return choose("Her website describes private one-to-one time, so you can ask about an individual meeting. Any arrangement, boundaries, and availability need to be confirmed directly with Lema.",
      'वेबसाइट पर निजी, एक-से-एक मुलाकात का ज़िक्र है। समय, व्यक्तिगत सीमाएँ और उपलब्धता की पुष्टि Lema से सीधे कीजिए।', '/contact/');
  }
  if (/(?:\b(?:safe|safety|consent|boundaries|privacy|confidential|discreet|respectful|protection)\b|सुरक्षित|गोपनीय|सहमति|सीमाएँ|सुरक्षा)/iu.test(q)) {
    return choose("Privacy, respect and clear boundaries matter. The website mentions discretion, but no assistant can promise specific safety conditions. Discuss expectations directly, and avoid sharing sensitive documents in chat.",
      'निजता, सम्मान और स्पष्ट सहमति ज़रूरी हैं। वेबसाइट पर गोपनीयता का ज़िक्र है, लेकिन सुरक्षा की गारंटी यहाँ नहीं दी जा सकती। कृपया संवेदनशील दस्तावेज़ चैट में न भेजें।', '/privacy/');
  }
  if (/(?:\b(?:are (?:the )?(?:photos|pics|pictures) real|is she real|real person|verify|verification|fake profile)\b|असली फोटो|फोटो असली|सच में)/iu.test(q)) {
    return choose("The gallery shows Lema's published portraits. I can't independently verify anyone's identity or photos; for reassurance, contact her through the official links and never share sensitive documents here.",
      'Gallery में Lema की प्रकाशित तस्वीरें हैं। मैं पहचान या तस्वीरों की स्वतंत्र पुष्टि नहीं कर सकती। आधिकारिक संपर्क लिंक से सीधे बात कीजिए।', '/gallery/');
  }
  if (/(?:\b(?:dinner|coffee date|go on a date|have dinner|dining)\b|डिनर|कॉफी डेट|खाना खाने)/iu.test(q)) {
    const dinner = (site.services || []).find(s => /dinner/i.test(s.title || ''));
    return choose(dinner ? "A dinner date is listed among Lema's options. You can ask her about the setting, timing and what she'd be comfortable with." : "You can ask her directly whether a dinner or coffee meeting is possible.",
      'वेबसाइट पर डिनर डेट का विकल्प दिया गया है। समय और बाकी विवरण के लिए Lema से सीधे पूछें।', '/services/');
  }
  if (/(?:\b(?:meet today|meet tonight|available today|free today|available now|book now|are you available|is she available|today at|tomorrow at)\b|आज मिल|आज फ्री|आज उपलब्ध|कल मिल)/iu.test(q)) {
    return choose("I can't see Lema's live calendar, so I don't want to promise a time. Her Contact page has the official ways to ask about availability.",
      'मेरे पास Lema के लाइव कैलेंडर की जानकारी नहीं है, इसलिए समय की पुष्टि नहीं कर सकती। उपलब्धता के लिए Contact पेज से पूछिए।', '/contact/');
  }
  if (/(?:\b(?:where is she|where does she live|which city|where is lema|where is her place)\b|कहाँ रहती|किस शहर|लोकेशन क्या)/iu.test(q)) {
    return choose("Her published profile says she's based in Gurgaon. An exact address isn't listed publicly; please ask her directly when arranging a meeting.",
      'प्रोफ़ाइल के अनुसार Lema गुरुग्राम में रहती हैं। सटीक पता सार्वजनिक नहीं है—विवरण के लिए सीधे उनसे पूछें।', '/about/');
  }
  if (/(?:\b(?:how are you|how is your day|what is up|what's up|how are things)\b|कैसे हो|कैसी हो|क्या हाल|kaise ho)/iu.test(q)) {
    return choose("I'm doing well, thanks for asking! 😊 How's your day going? You can ask me about Lema or anything else on your mind.",
      'मैं बढ़िया हूँ, पूछने के लिए शुक्रिया! 😊 आपका दिन कैसा चल रहा है?', '');
  }
  if (/(?:\b(?:tell (?:me )?a joke|something funny|make me laugh|joke)\b|चुटकुला|मज़ाक सुनाओ)/iu.test(q)) {
    return choose("Why did the website assistant bring a ladder? To take the conversation to the next level. 😄",
      'वेबसाइट असिस्टेंट सीढ़ी क्यों लाई? बातचीत को अगले लेवल पर ले जाने के लिए! 😄');
  }
  return null;
}
