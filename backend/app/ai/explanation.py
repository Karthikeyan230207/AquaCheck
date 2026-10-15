from app.schemas.analysis import AnalysisResult, AnalyzedParameter

_LANG_TRANSLATIONS = {
	"en": {
		"empty": "No water quality measurements were provided to analyze.",
		"all_good": "Everything in this water test looks clean, balanced, and safe for everyday drinking and cooking! All tested parameters sit comfortably within national and international drinking guidelines.",
		"caution": "This water is mostly usable, but a few parameters are approaching or slightly exceeding recommended aesthetic limits.",
		"danger": "Attention needed! One or more parameters in this report are outside recommended drinking safety limits.",
		"advice_prefix": "Recommended actions:",
		"untranslated_advice": "See the report for recommended actions.",
		"disclaimer": "Informational health screening based on recognized standards; always consult a certified local laboratory for legal or clinical water assessments.",
		"param_explain": {
			"pH": "pH is {status}: acidic water can leach pipe metals, while alkaline water causes scaling.",
			"TDS": "Total Dissolved Solids is {status}: indicates the amount of mineral salts dissolved.",
			"Turbidity": "Turbidity is {status}: measures water cloudiness and suspended particulate matter.",
			"Total Hardness": "Hardness is {status}: high levels leave mineral scale on appliances and pipes.",
			"Chloride": "Chloride is {status}: elevated levels impart a salty taste and increase corrosion.",
			"Fluoride": "Fluoride is {status}: essential for dental health in small doses, but harmful in excess.",
			"Nitrate": "Nitrate is {status}: fertilizer runoff that can be dangerous for infants and expectant mothers.",
			"Iron": "Iron is {status}: causes reddish-brown water discoloration and metallic taste.",
		},
	},
	"es": {
		"empty": "No se proporcionaron mediciones de calidad del agua para analizar.",
		"all_good": "¡Todo en esta prueba de agua se ve limpio, equilibrado y seguro para el consumo diario! Todos los parámetros analizados cumplen con las pautas de agua potable.",
		"caution": "Esta agua es mayormente utilizable, pero algunos parámetros se acercan a los límites recomendados.",
		"danger": "¡Se requiere atención! Uno o más parámetros están fuera de los límites de seguridad recomendados.",
		"advice_prefix": "Acciones recomendadas:",
		"untranslated_advice": "Consulte las acciones recomendadas en el informe.",
		"disclaimer": "Evaluación informativa basada en estándares de salud; consulte a un profesional calificado.",
		"param_explain": {
			"pH": "El pH está {status}: el agua ácida desgasta tuberías y el agua alcalina crea sarro.",
			"TDS": "Los sólidos disueltos (TDS) están {status}: indica la cantidad de sales minerales presentes.",
			"Turbidity": "La turbidez está {status}: mide la claridad o turbiedad del agua.",
			"Total Hardness": "La dureza total está {status}: niveles altos provocan acumulación de sarro.",
			"Chloride": "El cloruro está {status}: en exceso produce sabor salado y corrosión.",
			"Fluoride": "El fluoruro está {status}: protege los dientes pero en exceso puede mancharlos.",
			"Nitrate": "El nitrato está {status}: fertilizantes que pueden ser peligrosos para bebés.",
			"Iron": "El hierro está {status}: causa manchas rojizas y sabor a óxido metálico.",
		},
	},
	"hi": {
		"empty": "विश्लेषण के लिए पानी की गुणवत्ता का कोई माप उपलब्ध नहीं था।",
		"all_good": "इस पानी की जाँच में सब कुछ साफ, संतुलित और पीने के लिए सुरक्षित है! सभी मापदंड मानकों के भीतर हैं।",
		"caution": "यह पानी अधिकांश उपयोगों के लिए ठीक है, लेकिन कुछ पैरामीटर अनुशंसित सीमा के करीब हैं।",
		"danger": "ध्यान दें! इस रिपोर्ट में एक या अधिक पैरामीटर सुरक्षित पेयजल सीमा से बाहर हैं।",
		"advice_prefix": "सुझाए गए कदम:",
		"untranslated_advice": "रिपोर्ट में दिए गए सुझाए गए कदम देखें।",
		"disclaimer": "मान्यता प्राप्त मानकों पर आधारित सूचनात्मक जाँच; आवश्यकता पड़ने पर विशेषज्ञ से परामर्श करें।",
		"param_explain": {
			"pH": "pH {status} है: अम्लीय पानी पाइप को नुकसान पहुँचा सकता है, जबकि क्षारीय पानी से खारापन आता है।",
			"TDS": "TDS {status} है: यह पानी में घुले खनिज लवणों की मात्रा दर्शाता है।",
			"Turbidity": "गंदलापन (Turbidity) {status} है: यह पानी के धुंधलेपन को मापता है।",
			"Total Hardness": "कठोरता (Hardness) {status} है: अधिक कठोरता से बर्तनों पर सफेद परत जमती है।",
			"Chloride": "क्लोराइड {status} है: अधिक मात्रा से पानी में नमकीन स्वाद आता है।",
			"Fluoride": "फ्लोराइड {status} है: दांतों की सुरक्षा के लिए सीमित मात्रा में उपयोगी है।",
			"Nitrate": "नाइट्रेट {status} है: यह शिशुओं और गर्भवती महिलाओं के स्वास्थ्य के लिए हानिकारक हो सकता है।",
			"Iron": "आयरन (लोहा) {status} है: इससे पानी में लाल-भूरा रंग और धातु जैसा स्वाद आता है।",
		},
	},
	"ta": {
		"empty": "ஆய்வு செய்ய போதுமான அளவுருக்கள் வழங்கப்படவில்லை.",
		"all_good": "இந்த தண்ணீரில் உள்ள அனைத்து அளவுகளும் மிகச் சுத்தமாகவும் குடிப்பதற்கு பாதுகாப்பாகவும் உள்ளன! அனைத்து அளவுகளும் தரநிலைகளுக்குள் உள்ளன.",
		"caution": "இந்த நீர் பொதுவாகப் பயன்படுத்தக்கூடியது, ஆனால் சில அளவுகள் எச்சரிக்கை வரம்பிற்கு அருகில் உள்ளன.",
		"danger": "கவனம் தேவை! குடிநீர் பாதுகாப்பு வரம்புகளை விட சில அளவுகள் அதிகமாக உள்ளன.",
		"advice_prefix": "பரிந்துரைக்கப்பட்ட நடவடிக்கைகள்:",
		"untranslated_advice": "அறிக்கையில் பரிந்துரைக்கப்பட்ட நடவடிக்கைகளைப் பார்க்கவும்.",
		"disclaimer": "அங்கீகரிக்கப்பட்ட வழிகாட்டுதல்களின் அடிப்படையில் தகவல் அறிக்கை; சிறப்பு ஆய்வக ஆலோசனையைப் பெறவும்.",
		"param_explain": {
			"pH": "pH {status} ஆக உள்ளது: அமிலத்தன்மை குழாய்களை அரிக்கும், காரத்தன்மை உப்பை படியச் செய்யும்.",
			"TDS": "கரைந்த உப்புகள் (TDS) {status} ஆக உள்ளது: நீரில் கரைந்துள்ள தாதுக்களைக் குறிக்கிறது.",
			"Turbidity": "கலங்கல் தன்மை (Turbidity) {status} ஆக உள்ளது: நீரின் தெளிவின்மையை அளவிடுகிறது.",
			"Total Hardness": "கடினத்தன்மை {status} ஆக உள்ளது: பாத்திரங்களில் வெள்ளை உப்பு படியக் கூடும்.",
			"Chloride": "குளோரைடு {status} ஆக உள்ளது: உவர்ப்பு சுவையை ஏற்படுத்தும்.",
			"Fluoride": "புளோரைடு {status} ஆக உள்ளது: பற்களுக்கு நல்லது, ஆனால் எல்லை மீறினால் பற்களைப் பாதிக்கும்.",
			"Nitrate": "நைட்ரேட் {status} ஆக உள்ளது: குழந்தைகளுக்கு ஆபத்தானது, உடனடி வடிகட்டுதல் தேவை.",
			"Iron": "இரும்புச்சத்து {status} ஆக உள்ளது: நீரில் துரு நிறத்தையும் உலோகச் சுவையையும் தரும்.",
		},
	},
	"fr": {
		"empty": "Aucune mesure de qualité de l'eau n'a été fournie pour l'analyse.",
		"all_good": "Cette eau est propre, équilibrée et tout à fait sûre pour la consommation quotidienne! Tous les paramètres respectent les normes d'eau potable.",
		"caution": "Cette eau est globalement utilisable, mais certains paramètres nécessitent une attention particulière.",
		"danger": "Action requise ! Un ou plusieurs paramètres dépassent les limites de sécurité recommandées.",
		"advice_prefix": "Actions recommandées :",
		"untranslated_advice": "Consultez les actions recommandées dans le rapport.",
		"disclaimer": "Dépistage informatif basé sur des normes officielles ; consultez un laboratoire certifié si nécessaire.",
		"param_explain": {
			"pH": "Le pH est {status} : une eau acide corrode les tuyaux, une eau basique entartre.",
			"TDS": "Les matières dissoutes (TDS) sont {status} : indique la quantité de minéraux présents.",
			"Turbidity": "La turbidité est {status} : mesure la clarté ou le trouble de l'eau.",
			"Total Hardness": "La dureté totale est {status} : une eau trop dure favorise le calcaire.",
			"Chloride": "Le chlorure est {status} : donne un goût salé et accélère la corrosion.",
			"Fluoride": "Le fluorure est {status} : utile à faible dose, nocif en excès.",
			"Nitrate": "Le nitrate est {status} : résidus d'engrais dangereux pour les nourrissons.",
			"Iron": "Le fer est {status} : provoque une couleur rougeâtre et un goût métallique.",
		},
	},
}


def explain_analysis(analysis: AnalysisResult, lang: str = "en") -> str:
	language = lang.lower()
	t = _LANG_TRANSLATIONS.get(language, _LANG_TRANSLATIONS["en"])

	if not analysis.parameters:
		return t["empty"]

	outside = [p for p in analysis.parameters if p.status == "outside_range"]
	attention = [p for p in analysis.parameters if p.status == "attention"]

	paragraphs: list[str] = []

	if outside:
		headline = t["danger"]
	elif attention:
		headline = t["caution"]
	else:
		headline = t["all_good"]

	paragraphs.append(headline)

	# Build friendly human narrative
	findings: list[str] = []
	for p in analysis.parameters:
		if p.status in {"outside_range", "attention"}:
			template = t["param_explain"].get(p.parameter)
			status_word = "elevated / out of range" if p.status == "outside_range" else "borderline"
			if language == "es":
				status_word = "fuera de rango" if p.status == "outside_range" else "en observación"
			elif language == "hi":
				status_word = "सीमा से बाहर" if p.status == "outside_range" else "चेतावनी स्तर पर"
			elif language == "ta":
				status_word = "அளவுக்கு அதிகமாக" if p.status == "outside_range" else "கவனிக்கப்பட வேண்டிய அளவில்"
			elif language == "fr":
				status_word = "hors limites" if p.status == "outside_range" else "à surveiller"

			if template:
				findings.append(template.format(status=status_word))

	if findings:
		paragraphs.append(" ".join(findings))

	if analysis.recommendations:
		if language == "en":
			actions = "; ".join(analysis.recommendations[:3])
		else:
			actions = t["untranslated_advice"]
		paragraphs.append(f"{t['advice_prefix']} {actions}")

	paragraphs.append(t["disclaimer"])
	return " \n\n".join(paragraphs)
