export type BeproLocale = "fr" | "ar";

export const categoryNames: Record<string, { fr: string; ar: string }> = {
  "chaussures-de-sport": { fr: "Chaussures de sport", ar: "أحذية رياضية" },
  "vetements-de-sport": { fr: "Vêtements de sport", ar: "ملابس رياضية" },
  "sacs-de-sport": { fr: "Sacs de sport", ar: "حقائب رياضية" },
  "equipements-entrainement": { fr: "Équipements d'entraînement", ar: "معدات التدريب" },
  accessoires: { fr: "Accessoires", ar: "إكسسوارات" },
};

export const productNames: Record<string, { fr: string; ar: string }> = {
  "performance-running": { fr: "Chaussures de running Performance", ar: "حذاء الجري بيرفورمانس" },
  "training-energy": { fr: "Chaussures d'entraînement Energy", ar: "حذاء التدريب إينرجي" },
  "football-terrain": { fr: "Chaussures de football Terrain", ar: "حذاء كرة القدم تيرين" },
  "tshirt-respirant": { fr: "T-shirt sport respirant", ar: "تيشيرت رياضي جيد التهوية" },
  "short-movement": { fr: "Short de sport Movement", ar: "شورت رياضي موفمنت" },
  "jogging-essential": { fr: "Pantalon de jogging Essential", ar: "بنطال رياضي إسنشال" },
  "sac-a-dos-active": { fr: "Sac à dos Active", ar: "حقيبة ظهر أكتيف" },
  "sac-sport-duffle": { fr: "Sac de sport Duffle", ar: "حقيبة رياضية دافل" },
  "set-halteres-20kg": { fr: "Set d'haltères 20 kg", ar: "مجموعة دمبل 20 كغ" },
  "corde-a-sauter": { fr: "Corde à sauter rapide", ar: "حبل قفز سريع" },
  "montre-connectee-sport": { fr: "Montre connectée de sport", ar: "ساعة رياضية ذكية" },
  "casquette-sport": { fr: "Casquette sport respirante", ar: "قبعة رياضية جيدة التهوية" },
};

export function localizedProductName(product: { handle?: string; name: string }, lang: BeproLocale) {
  return (product.handle && productNames[product.handle]?.[lang]) || product.name;
}

export function variantDisplay(variations: unknown): string {
  if (!variations) return "";
  if (typeof variations === "object") return Object.values(variations as Record<string, unknown>).join(" / ");
  try { return Object.values(JSON.parse(String(variations))).join(" / "); } catch { return String(variations); }
}

export const copy = {
  fr: {
    home: "Accueil", products: "Nos produits", categories: "Catégories", track: "Suivi commande", cart: "Panier",
    language: "العربية", menu: "Menu", close: "Fermer", search: "Rechercher un produit", allCategories: "Toutes les catégories",
    heroEyebrow: "VOTRE PARTENAIRE SPORT EN ALGÉRIE", heroTitle: "Bougez. Performez. Recommencez.",
    heroText: "Une sélection sport simple, fiable et livrée dans les 58 wilayas. Commandez maintenant, payez à la réception.",
    heroCta: "Voir les produits", heroSecondary: "Nos promotions", featured: "Notre sélection", featuredSub: "Les essentiels pour votre prochain entraînement.",
    promotions: "Offres et réductions", promotionsSub: "Des prix légers pour des objectifs ambitieux.", viewAll: "Voir tous les produits",
    reviews: "Ils bougent avec bepro", reviewsSub: "Des achats simples, une équipe à votre écoute.",
    faq: "Questions fréquentes", faqSub: "Tout ce qu'il faut savoir avant de commander.",
    delivery: "Livraison 58 wilayas", deliveryText: "À domicile ou en stop desk", cod: "Paiement à la livraison", codText: "Payez seulement à la réception",
    support: "Commande facile", supportText: "Confirmation par téléphone", quality: "Sélection sport", qualityText: "Des essentiels pour chaque objectif",
    add: "Ajouter au panier", added: "Produit ajouté au panier", options: "Voir les options", chooseSize: "Choisir la taille", quantity: "Quantité",
    from: "À partir de", discount: "de remise", size: "Taille", productDetails: "Détails du produit", buyNow: "Commander maintenant",
    cartTitle: "Votre panier", cartEmpty: "Votre panier est vide", cartEmptyText: "Découvrez notre sélection et ajoutez vos essentiels sport.",
    continue: "Continuer mes achats", subtotal: "Sous-total", shipping: "Livraison", shippingCheckout: "Calculée à l'étape suivante", total: "Total",
    checkout: "Passer la commande", remove: "Retirer", decrease: "Diminuer la quantité", increase: "Augmenter la quantité",
    checkoutTitle: "Finaliser ma commande", checkoutText: "Livraison partout en Algérie", contactInfo: "Vos informations", deliveryInfo: "Mode de livraison",
    fullName: "Nom complet", phone: "Numéro de téléphone", phoneHint: "Ex. 0550 12 34 56", wilaya: "Wilaya", commune: "Commune", selectWilaya: "Sélectionnez votre wilaya", selectCommune: "Sélectionnez votre commune",
    address: "Adresse complète", addressHint: "Rue, quartier, point de repère…", homeDelivery: "Livraison à domicile", deskDelivery: "Stop desk", notes: "Remarques (facultatif)", notesHint: "Instructions particulières",
    orderSummary: "Récapitulatif de la commande", free: "Gratuite", confirmOrder: "Confirmer la commande", confirmHint: "En confirmant, vous acceptez d'être contacté pour valider la commande.",
    trackTitle: "Suivre ma commande", trackText: "Saisissez votre numéro de commande et le téléphone utilisé lors de l'achat.", orderNumber: "Numéro de commande", trackCta: "Rechercher ma commande",
    trackPending: "Commande reçue", trackConfirmed: "Commande confirmée", trackDispatched: "Commande expédiée", trackDelivered: "Commande livrée", trackReturned: "Commande retournée / annulée",
    orderDate: "Commande passée le", orderedItems: "Articles commandés", trackingNotFound: "Commande introuvable. Vérifiez le numéro et le téléphone.",
    thanksTitle: "Merci pour votre commande !", thanksText: "Votre commande a bien été enregistrée. Notre équipe vous contactera pour la confirmer.", keepNumber: "Conservez ce numéro pour suivre votre commande", backHome: "Retour à l'accueil",
    filter: "Filtrer", sort: "Trier par", newest: "Nouveautés", priceAsc: "Prix croissant", priceDesc: "Prix décroissant", name: "Nom", results: "produits", previous: "Précédent", next: "Suivant", noProducts: "Aucun produit ne correspond à ces filtres.",
    footerText: "Votre sélection sport en Algérie, avec paiement à la livraison.", contact: "Contact", usefulLinks: "Liens utiles", legal: "Informations légales", privacy: "Confidentialité", terms: "Conditions de vente", returns: "Livraison et retours",
    whatsapp: "Commander sur WhatsApp", email: "contact@bepro.example", phoneDisplay: "0550 00 00 00", placeholderContact: "Coordonnées de démonstration",
    description: "Pensé pour vos entraînements et votre quotidien actif. Ajoutez ce produit à votre panier, choisissez votre livraison et payez à la réception.",
  },
  ar: {
    home: "الرئيسية", products: "منتجاتنا", categories: "الفئات", track: "تتبع الطلب", cart: "السلة",
    language: "Français", menu: "القائمة", close: "إغلاق", search: "ابحث عن منتج", allCategories: "كل الفئات",
    heroEyebrow: "شريكك الرياضي في الجزائر", heroTitle: "تحرّك. تقدّم. أعد الكرة.",
    heroText: "تشكيلة رياضية عملية وموثوقة مع التوصيل إلى 58 ولاية. اطلب الآن وادفع عند الاستلام.",
    heroCta: "تصفح المنتجات", heroSecondary: "عروضنا وتخفيضاتنا", featured: "تشكيلتنا المختارة", featuredSub: "كل الأساسيات لتدريبك القادم.",
    promotions: "العروض والتخفيضات", promotionsSub: "أسعار مناسبة لأهداف كبيرة.", viewAll: "عرض كل المنتجات",
    reviews: "يتحركون مع bepro", reviewsSub: "تسوق بسيط وفريق في خدمتك.",
    faq: "الأسئلة الشائعة", faqSub: "كل ما تحتاج معرفته قبل الطلب.",
    delivery: "التوصيل إلى 58 ولاية", deliveryText: "إلى المنزل أو مكتب الاستلام", cod: "الدفع عند الاستلام", codText: "ادفع فقط عند استلام طلبك",
    support: "طلب سهل", supportText: "تأكيد الطلب عبر الهاتف", quality: "تشكيلة رياضية", qualityText: "أساسيات لكل أهدافك",
    add: "أضف إلى السلة", added: "تمت إضافة المنتج إلى السلة", options: "عرض الخيارات", chooseSize: "اختر المقاس", quantity: "الكمية",
    from: "ابتداءً من", discount: "تخفيض", size: "المقاس", productDetails: "تفاصيل المنتج", buyNow: "اطلب الآن",
    cartTitle: "سلة التسوق", cartEmpty: "سلتك فارغة", cartEmptyText: "اكتشف تشكيلتنا وأضف أساسياتك الرياضية.",
    continue: "مواصلة التسوق", subtotal: "المجموع الفرعي", shipping: "التوصيل", shippingCheckout: "يُحسب في الخطوة التالية", total: "المجموع",
    checkout: "إتمام الطلب", remove: "إزالة", decrease: "إنقاص الكمية", increase: "زيادة الكمية",
    checkoutTitle: "إتمام طلبي", checkoutText: "التوصيل إلى كل ولايات الجزائر", contactInfo: "معلوماتك", deliveryInfo: "طريقة التوصيل",
    fullName: "الاسم الكامل", phone: "رقم الهاتف", phoneHint: "مثال: 0550 12 34 56", wilaya: "الولاية", commune: "البلدية", selectWilaya: "اختر ولايتك", selectCommune: "اختر بلديتك",
    address: "العنوان الكامل", addressHint: "الشارع، الحي، علامة مميزة…", homeDelivery: "التوصيل إلى المنزل", deskDelivery: "مكتب الاستلام", notes: "ملاحظات (اختياري)", notesHint: "تعليمات خاصة",
    orderSummary: "ملخص الطلب", free: "مجاني", confirmOrder: "تأكيد الطلب", confirmHint: "بتأكيدك، توافق على الاتصال بك للتحقق من الطلب.",
    trackTitle: "تتبع طلبي", trackText: "أدخل رقم الطلب ورقم الهاتف المستخدم عند الشراء.", orderNumber: "رقم الطلب", trackCta: "البحث عن طلبي",
    trackPending: "تم استلام الطلب", trackConfirmed: "تم تأكيد الطلب", trackDispatched: "تم إرسال الطلب", trackDelivered: "تم تسليم الطلب", trackReturned: "تم إرجاع / إلغاء الطلب",
    orderDate: "تاريخ الطلب", orderedItems: "المنتجات المطلوبة", trackingNotFound: "الطلب غير موجود. تحقق من الرقم والهاتف.",
    thanksTitle: "شكراً على طلبك!", thanksText: "تم تسجيل طلبك بنجاح. سيتصل بك فريقنا لتأكيده.", keepNumber: "احتفظ بهذا الرقم لتتبع طلبك", backHome: "العودة إلى الرئيسية",
    filter: "تصفية", sort: "ترتيب حسب", newest: "الأحدث", priceAsc: "السعر: من الأقل", priceDesc: "السعر: من الأعلى", name: "الاسم", results: "منتجات", previous: "السابق", next: "التالي", noProducts: "لا توجد منتجات مطابقة لهذه التصفية.",
    footerText: "تشكيلتك الرياضية في الجزائر مع الدفع عند الاستلام.", contact: "اتصل بنا", usefulLinks: "روابط مفيدة", legal: "معلومات قانونية", privacy: "الخصوصية", terms: "شروط البيع", returns: "التوصيل والإرجاع",
    whatsapp: "اطلب عبر واتساب", email: "contact@bepro.example", phoneDisplay: "0550 00 00 00", placeholderContact: "بيانات اتصال تجريبية",
    description: "مصمم لتدريباتك وحياتك النشطة. أضف هذا المنتج إلى سلتك، اختر طريقة التوصيل وادفع عند الاستلام.",
  },
} as const;

export const faq = {
  fr: [
    ["Quels sont les délais de livraison ?", "La livraison prend généralement 1 à 4 jours ouvrables selon la wilaya. Notre équipe confirme la commande avant l'expédition."],
    ["Comment payer ma commande ?", "Vous payez en espèces à la réception, à domicile ou au stop desk. Aucun paiement en ligne n'est demandé."],
    ["Puis-je choisir le stop desk ?", "Oui, lorsque ce mode est disponible pour votre wilaya. Les frais correspondants s'affichent avant la confirmation."],
    ["Comment suivre mon colis ?", "Ouvrez la page Suivi commande et saisissez le numéro reçu après l'achat avec votre numéro de téléphone."],
    ["Puis-je modifier ou retourner un article ?", "Contactez-nous rapidement avec votre numéro de commande. Toute demande est examinée selon l'état de préparation du colis."],
  ],
  ar: [
    ["ما هي مدة التوصيل؟", "يستغرق التوصيل عادة من 1 إلى 4 أيام عمل حسب الولاية. يؤكد فريقنا الطلب قبل إرساله."],
    ["كيف أدفع ثمن طلبي؟", "تدفع نقداً عند الاستلام في المنزل أو مكتب الاستلام. لا نطلب أي دفع إلكتروني."],
    ["هل يمكنني اختيار مكتب الاستلام؟", "نعم عندما تكون الخدمة متاحة في ولايتك. تظهر التكلفة قبل تأكيد الطلب."],
    ["كيف أتتبع طلبي؟", "افتح صفحة تتبع الطلب وأدخل الرقم الذي استلمته بعد الشراء ورقم هاتفك."],
    ["هل يمكن تعديل أو إرجاع منتج؟", "اتصل بنا سريعاً مع رقم الطلب. نراجع كل طلب حسب مرحلة تجهيز الطرد."],
  ],
} as const;

export const testimonials = {
  fr: [
    ["Amine B.", "Alger", "Commande claire et appel de confirmation rapide. Les chaussures correspondent exactement à ce que je cherchais."],
    ["Sarah K.", "Oran", "J'ai pu choisir la taille et le stop desk sans difficulté. Le suivi par téléphone est rassurant."],
    ["Yacine M.", "Sétif", "Bon rapport qualité-prix pour mes accessoires d'entraînement. Le paiement à la livraison est très pratique."],
  ],
  ar: [
    ["أمين ب.", "الجزائر", "طلب واضح واتصال تأكيد سريع. الحذاء مطابق تماماً لما كنت أبحث عنه."],
    ["سارة ك.", "وهران", "اخترت المقاس ومكتب الاستلام بسهولة. المتابعة عبر الهاتف مطمئنة."],
    ["ياسين م.", "سطيف", "سعر مناسب لمعدات التدريب. الدفع عند الاستلام عملي جداً."],
  ],
} as const;
