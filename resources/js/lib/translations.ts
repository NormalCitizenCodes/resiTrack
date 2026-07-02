// Translations for resident-facing UI chrome only (labels, buttons, status
// words, instructional copy). Deliberately NOT translated: program titles,
// resident names, sector names, and auto-generated classification reasons —
// those are user/system-generated content, a different (bigger) problem than
// translating fixed UI text, and out of scope for this pass.
//
// Filipino and Cebuano (Bisaya) are both offered rather than just Filipino:
// Barangay 22 is in Cagayan de Oro (Region X), where Cebuano is the language
// most residents actually think in, even though Filipino is taught in school.
//
// Machine-authored — worth a native-speaker proofread pass before a live
// defense, especially the Cebuano strings.

export type Language = 'en' | 'fil' | 'ceb';

export const LANGUAGES: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'fil', label: 'Filipino' },
    { code: 'ceb', label: 'Bisaya' },
];

type Dictionary = Record<string, string>;

const en: Dictionary = {
    'nav.dashboard': 'Dashboard',
    'nav.programs': 'Programs',
    'nav.myApplications': 'My Applications',
    'nav.announcements': 'Announcements',
    'nav.myProfile': 'My Profile',

    'common.viewAll': 'View all',
    'common.pending': 'pending',
    'common.approved': 'approved',
    'common.rejected': 'rejected',
    'common.readAloud': 'Read aloud',
    'common.stopReading': 'Stop reading',
    'time.justNow': 'Just now',
    'common.notLinked':
        "Your account is not yet linked to a resident record. Please visit your barangay hall to complete your profile.",

    'dashboard.welcome': 'Welcome, {name}',
    'dashboard.welcomeGeneric': 'Welcome',
    'dashboard.subtitle': 'Programs, announcements, and updates for you.',
    'dashboard.profile.title': 'Your Profile',
    'dashboard.profile.percentComplete': '{percent}% complete',
    'dashboard.profile.addField': 'Add your {field} to help us match you to more programs.',
    'dashboard.profile.addFieldMore':
        'Add your {field} and {count} other detail(s) to help us match you to more programs.',
    'dashboard.profile.complete': 'Your profile is complete. Nice work.',
    'dashboard.profile.update': 'Update Profile',
    'dashboard.sectors.title': 'You Qualify As',
    'dashboard.sectors.empty': "None yet — you'll still see programs open to everyone in your feed.",
    'dashboard.feed.title': 'Feed',
    'dashboard.feed.empty': 'Nothing yet — programs and barangay announcements will show up here.',
    'dashboard.feed.markRead': 'Mark read',
    'dashboard.feed.viewAll': 'View all notifications',
    'dashboard.applications.title': 'My Applications',
    'dashboard.applications.empty': "You haven't applied to any programs yet.",
    'dashboard.applications.browse': 'Browse programs',
    'dashboard.applications.viewAll': 'View all',

    'field.contact_number': 'Contact number',
    'field.email': 'Email address',
    'field.address': 'Address',
    'field.civil_status': 'Civil status',
    'field.occupation': 'Occupation',
    'field.employment_status': 'Employment status',
    'field.education_level': 'Highest education level',
    'field.education_status': 'School enrollment status',
    'field.monthly_income': 'Monthly income',

    'profile.title': 'My Profile',
    'profile.subtitle': "Keep this up to date — it's what we use to match you to programs you may qualify for.",
    'profile.save': 'Save Changes',

    'option.single': 'Single',
    'option.married': 'Married',
    'option.widowed': 'Widowed',
    'option.separated': 'Separated',
    'option.employed': 'Employed',
    'option.unemployed': 'Unemployed',
    'option.self_employed': 'Self-Employed',
    'option.elementary': 'Elementary',
    'option.highschool': 'Highschool',
    'option.college': 'College',
    'option.vocational': 'Vocational',
    'option.none': 'None',
    'option.enrolled': 'Enrolled',
    'option.not_enrolled': 'Not Enrolled',
    'option.graduated': 'Graduated',

    'announcements.title': 'Announcements',
    'announcements.subtitleResident': 'Updates from your barangay.',
    'announcements.empty': 'No announcements yet.',
    'announcements.allResidents': 'All residents',
    'announcements.expires': 'Expires {date}',

    'notifications.title': 'Notifications',
    'notifications.unread': '{count} unread',
    'notifications.caughtUp': 'You are all caught up.',
    'notifications.markAllRead': 'Mark all read',
    'notifications.empty': 'No notifications yet.',
    'notifications.markRead': 'Mark read',
    'notifications.type.program_match': 'Program',
    'notifications.type.announcement': 'Announcement',
    'notifications.type.duplicate_alert': 'Duplicate',
    'notifications.type.system': 'System',

    'programs.available': 'Available Programs',
    'programs.subtitle': 'Government social services delivered through partner agencies.',
    'programs.emptyResident': 'No active programs available right now.',
    'programs.slotsOpen': 'open',
    'programs.slots': 'slots',
    'programs.viewDetails': 'View details',
    'programs.yourApplication': 'Your Application',
    'programs.status': 'Status',
    'programs.qualify': 'You qualify for this program.',
    'programs.applyNow': 'Apply now',
    'programs.notQualify': "You don't currently qualify for this program.",
    'programs.myApplications.title': 'My Applications',
    'programs.myApplications.subtitle': 'Track the status of the programs you applied to.',
    'programs.myApplications.empty': "You haven't applied to any programs yet.",
    'programs.myApplications.browse': 'Browse programs',
    'programs.myApplications.program': 'Program',
    'programs.myApplications.agency': 'Agency',
    'programs.myApplications.applied': 'Applied',
};

const fil: Dictionary = {
    'nav.dashboard': 'Pangunahing Pahina',
    'nav.programs': 'Mga Programa',
    'nav.myApplications': 'Aking mga Aplikasyon',
    'nav.announcements': 'Mga Anunsyo',
    'nav.myProfile': 'Aking Impormasyon',

    'common.viewAll': 'Tingnan lahat',
    'common.pending': 'naghihintay',
    'common.approved': 'naaprubahan',
    'common.rejected': 'hindi naaprubahan',
    'common.readAloud': 'Basahin nang malakas',
    'common.stopReading': 'Ihinto ang pagbasa',
    'time.justNow': 'Ngayon lang',
    'common.notLinked':
        'Ang iyong account ay hindi pa naka-link sa isang rekord ng residente. Bumisita sa barangay hall para kumpletuhin ang iyong impormasyon.',

    'dashboard.welcome': 'Maligayang pagdating, {name}',
    'dashboard.welcomeGeneric': 'Maligayang pagdating',
    'dashboard.subtitle': 'Mga programa, anunsyo, at balita para sa iyo.',
    'dashboard.profile.title': 'Iyong Impormasyon',
    'dashboard.profile.percentComplete': '{percent}% kumpleto',
    'dashboard.profile.addField': 'Idagdag ang iyong {field} para matulungan kang mahanap ang mga programang angkop sa iyo.',
    'dashboard.profile.addFieldMore':
        'Idagdag ang iyong {field} at {count} pang detalye para matulungan kang mahanap ang mga programang angkop sa iyo.',
    'dashboard.profile.complete': 'Kumpleto na ang iyong impormasyon. Magaling!',
    'dashboard.profile.update': 'I-update ang Impormasyon',
    'dashboard.sectors.title': 'Kwalipikado Ka Bilang',
    'dashboard.sectors.empty': 'Wala pa sa ngayon — makikita mo pa rin ang mga programang bukas sa lahat sa iyong feed.',
    'dashboard.feed.title': 'Mga Balita',
    'dashboard.feed.empty': 'Wala pang laman — dito lalabas ang mga programa at anunsyo mula sa barangay.',
    'dashboard.feed.markRead': 'Nabasa na',
    'dashboard.feed.viewAll': 'Tingnan lahat ng abiso',
    'dashboard.applications.title': 'Aking mga Aplikasyon',
    'dashboard.applications.empty': 'Wala ka pang na-apply na programa.',
    'dashboard.applications.browse': 'Tingnan ang mga programa',
    'dashboard.applications.viewAll': 'Tingnan lahat',

    'field.contact_number': 'Numero ng Telepono',
    'field.email': 'Email',
    'field.address': 'Address',
    'field.civil_status': 'Katayuang Sibil',
    'field.occupation': 'Trabaho',
    'field.employment_status': 'Katayuan sa Trabaho',
    'field.education_level': 'Pinakamataas na Naabot na Edukasyon',
    'field.education_status': 'Katayuan sa Pag-aaral',
    'field.monthly_income': 'Buwanang Kita',

    'profile.title': 'Aking Impormasyon',
    'profile.subtitle': 'Panatilihing updated ito — ito ang ginagamit namin para itugma ka sa mga programang maaaring makatulong sa iyo.',
    'profile.save': 'I-save ang mga Pagbabago',

    'option.single': 'Walang Asawa',
    'option.married': 'Kasal',
    'option.widowed': 'Balo',
    'option.separated': 'Hiwalay',
    'option.employed': 'May Trabaho',
    'option.unemployed': 'Walang Trabaho',
    'option.self_employed': 'Sariling Negosyo',
    'option.elementary': 'Elementarya',
    'option.highschool': 'High School',
    'option.college': 'Kolehiyo',
    'option.vocational': 'Bokasyonal',
    'option.none': 'Wala',
    'option.enrolled': 'Nag-aaral',
    'option.not_enrolled': 'Hindi Nag-aaral',
    'option.graduated': 'Nagtapos',

    'announcements.title': 'Mga Anunsyo',
    'announcements.subtitleResident': 'Mga balita mula sa iyong barangay.',
    'announcements.empty': 'Wala pang anunsyo.',
    'announcements.allResidents': 'Lahat ng residente',
    'announcements.expires': 'Mag-e-expire sa {date}',

    'notifications.title': 'Mga Abiso',
    'notifications.unread': '{count} hindi pa nabasa',
    'notifications.caughtUp': 'Wala ka nang bagong abiso.',
    'notifications.markAllRead': 'Markahan lahat na nabasa',
    'notifications.empty': 'Wala pang abiso.',
    'notifications.markRead': 'Nabasa na',
    'notifications.type.program_match': 'Programa',
    'notifications.type.announcement': 'Anunsyo',
    'notifications.type.duplicate_alert': 'Duplicate',
    'notifications.type.system': 'Sistema',

    'programs.available': 'Mga Bukas na Programa',
    'programs.subtitle': 'Mga serbisyong panlipunan mula sa gobyerno sa pamamagitan ng mga kasosyong ahensya.',
    'programs.emptyResident': 'Walang aktibong programa sa ngayon.',
    'programs.slotsOpen': 'bakante',
    'programs.slots': 'puwang',
    'programs.viewDetails': 'Tingnan ang detalye',
    'programs.yourApplication': 'Iyong Aplikasyon',
    'programs.status': 'Katayuan',
    'programs.qualify': 'Kwalipikado ka para sa programang ito.',
    'programs.applyNow': 'Mag-apply Ngayon',
    'programs.notQualify': 'Hindi ka pa kwalipikado para sa programang ito.',
    'programs.myApplications.title': 'Aking mga Aplikasyon',
    'programs.myApplications.subtitle': 'Subaybayan ang katayuan ng mga programang na-applyan mo.',
    'programs.myApplications.empty': 'Wala ka pang na-apply na programa.',
    'programs.myApplications.browse': 'Tingnan ang mga programa',
    'programs.myApplications.program': 'Programa',
    'programs.myApplications.agency': 'Ahensya',
    'programs.myApplications.applied': 'Petsa ng Aplikasyon',
};

const ceb: Dictionary = {
    'nav.dashboard': 'Panguna nga Panid',
    'nav.programs': 'Mga Programa',
    'nav.myApplications': 'Akong mga Aplikasyon',
    'nav.announcements': 'Mga Pahibalo',
    'nav.myProfile': 'Akong Impormasyon',

    'common.viewAll': 'Tan-awa tanan',
    'common.pending': 'gihulat pa',
    'common.approved': 'naaprobahan',
    'common.rejected': 'wala maaprobahan',
    'common.readAloud': 'Basaha og kusog',
    'common.stopReading': 'Hunonga ang pagbasa',
    'time.justNow': 'Karon lang',
    'common.notLinked':
        'Ang imong account wala pa ma-link sa rekord sa residente. Bisita sa barangay hall aron makumpleto ang imong impormasyon.',

    'dashboard.welcome': 'Maayong pag-abot, {name}',
    'dashboard.welcomeGeneric': 'Maayong pag-abot',
    'dashboard.subtitle': 'Mga programa, pahibalo, ug balita alang kanimo.',
    'dashboard.profile.title': 'Imong Impormasyon',
    'dashboard.profile.percentComplete': '{percent}% kompleto',
    'dashboard.profile.addField': 'Idugang ang imong {field} aron matabangan ka nga makit-an ang mga programa nga angay kanimo.',
    'dashboard.profile.addFieldMore':
        'Idugang ang imong {field} ug {count} pa ka detalye aron matabangan ka nga makit-an ang mga programa nga angay kanimo.',
    'dashboard.profile.complete': 'Kompleto na ang imong impormasyon. Maayo kaayo!',
    'dashboard.profile.update': 'I-update ang Impormasyon',
    'dashboard.sectors.title': 'Kwalipikado Ka Isip',
    'dashboard.sectors.empty': 'Wala pa sa pagkakaron — makita gihapon nimo ang mga programa nga bukas sa tanan sa imong feed.',
    'dashboard.feed.title': 'Mga Balita',
    'dashboard.feed.empty': 'Wala pay sulod — dinhi mogawas ang mga programa ug pahibalo gikan sa barangay.',
    'dashboard.feed.markRead': 'Nabasa na',
    'dashboard.feed.viewAll': 'Tan-awa ang tanang pahibalo',
    'dashboard.applications.title': 'Akong mga Aplikasyon',
    'dashboard.applications.empty': 'Wala ka pay gi-apply nga programa.',
    'dashboard.applications.browse': 'Tan-awa ang mga programa',
    'dashboard.applications.viewAll': 'Tan-awa tanan',

    'field.contact_number': 'Numero sa Telepono',
    'field.email': 'Email',
    'field.address': 'Address',
    'field.civil_status': 'Kahimtang Sibil',
    'field.occupation': 'Trabaho',
    'field.employment_status': 'Kahimtang sa Trabaho',
    'field.education_level': 'Kinatas-ang Nahuman nga Edukasyon',
    'field.education_status': 'Kahimtang sa Pagtuon',
    'field.monthly_income': 'Buwanang Kita',

    'profile.title': 'Akong Impormasyon',
    'profile.subtitle': 'Ipabag-o kanunay kini — gigamit namo kini aron itugma ka sa mga programa nga mahimo kang makatabang.',
    'profile.save': 'I-save ang mga Kausaban',

    'option.single': 'Walay Kapikas',
    'option.married': 'Minyo',
    'option.widowed': 'Balo',
    'option.separated': 'Nagbulag',
    'option.employed': 'May Trabaho',
    'option.unemployed': 'Walay Trabaho',
    'option.self_employed': 'Kaugalingong Negosyo',
    'option.elementary': 'Elementarya',
    'option.highschool': 'High School',
    'option.college': 'Kolehiyo',
    'option.vocational': 'Bokasyonal',
    'option.none': 'Wala',
    'option.enrolled': 'Nag-eskwela',
    'option.not_enrolled': 'Wala Mag-eskwela',
    'option.graduated': 'Nakahuman',

    'announcements.title': 'Mga Pahibalo',
    'announcements.subtitleResident': 'Mga balita gikan sa imong barangay.',
    'announcements.empty': 'Wala pay pahibalo.',
    'announcements.allResidents': 'Tanang residente',
    'announcements.expires': 'Mahuman sa {date}',

    'notifications.title': 'Mga Abiso',
    'notifications.unread': '{count} wala pa mabasa',
    'notifications.caughtUp': 'Wala ka nay bag-ong abiso.',
    'notifications.markAllRead': 'Markahi tanan nga nabasa',
    'notifications.empty': 'Wala pay abiso.',
    'notifications.markRead': 'Nabasa na',
    'notifications.type.program_match': 'Programa',
    'notifications.type.announcement': 'Pahibalo',
    'notifications.type.duplicate_alert': 'Duplicate',
    'notifications.type.system': 'Sistema',

    'programs.available': 'Mga Bukas nga Programa',
    'programs.subtitle': 'Mga serbisyo sosyal gikan sa gobyerno pinaagi sa mga kasosyo nga ahensya.',
    'programs.emptyResident': 'Walay aktibo nga programa sa pagkakaron.',
    'programs.slotsOpen': 'bakante',
    'programs.slots': 'luna',
    'programs.viewDetails': 'Tan-awa ang detalye',
    'programs.yourApplication': 'Imong Aplikasyon',
    'programs.status': 'Kahimtang',
    'programs.qualify': 'Kwalipikado ka para niini nga programa.',
    'programs.applyNow': 'Mag-apply Karon',
    'programs.notQualify': 'Wala ka pa kwalipikado para niini nga programa.',
    'programs.myApplications.title': 'Akong mga Aplikasyon',
    'programs.myApplications.subtitle': 'Subaya ang kahimtang sa mga programa nga imong gi-applyan.',
    'programs.myApplications.empty': 'Wala ka pay gi-apply nga programa.',
    'programs.myApplications.browse': 'Tan-awa ang mga programa',
    'programs.myApplications.program': 'Programa',
    'programs.myApplications.agency': 'Ahensya',
    'programs.myApplications.applied': 'Petsa sa Aplikasyon',
};

export const TRANSLATIONS: Record<Language, Dictionary> = { en, fil, ceb };

export function translate(language: Language, key: string, vars?: Record<string, string | number>): string {
    let text = TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;

    if (vars) {
        for (const [name, value] of Object.entries(vars)) {
            text = text.replace(`{${name}}`, String(value));
        }
    }

    return text;
}
