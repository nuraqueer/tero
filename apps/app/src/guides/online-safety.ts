import type { GuideText } from './types';

export const onlineSafety: GuideText = {
  en: {
    note: 'General advice. What is safest depends on where you live and who might look at your phone.',
    sections: [
      {
        id: 'lock',
        heading: 'Lock your phone well',
        paragraphs: [
          'Use a passcode of at least six digits, not a pattern, a birthday or a repeated number. Set the screen to lock after a minute or less.',
          'Hide message previews on the lock screen, so nobody can read your notifications over your shoulder or while the phone is locked.',
        ],
      },
      {
        id: 'updates',
        heading: 'Keep it up to date',
        paragraphs: [
          'Install updates for your phone and apps soon after they arrive. Most updates fix security holes that are already being used.',
          'Only install apps from the official app store, and remove apps you no longer use.',
        ],
      },
      {
        id: 'accounts',
        heading: 'Protect your accounts',
        paragraphs: [
          'Use a different password for every account. A password manager can remember them for you.',
          'Turn on two-step verification. An authenticator app is safer than codes sent by text message, which can be intercepted or redirected.',
        ],
      },
      {
        id: 'messages',
        heading: 'Talk privately',
        paragraphs: [
          'Use apps with end-to-end encryption, and turn on messages that disappear. Remember that the other person can still take a screenshot, and their phone can be checked too.',
          'Before sending a photo, think about what is in it: faces, tattoos, street signs or anything else that could identify you or someone else.',
        ],
      },
      {
        id: 'photos',
        heading: 'Photos and location',
        paragraphs: [
          'Photos can carry the place where they were taken. Turn off location for the camera, or remove it before sharing. Tero removes it for you.',
          'Check which apps can see your location, and allow it only while you are using them.',
        ],
      },
      {
        id: 'checked',
        heading: 'If someone checks your phone',
        paragraphs: [
          'Think ahead about what is on your phone. Fewer apps, old chats and photos means less for someone to find.',
          'Tero has a decoy passcode. If you are forced to open it, the decoy shows a plain view with nothing of yours in it.',
          'In some countries, using a VPN or certain apps draws attention or is against the law. Find out what applies where you live before relying on them.',
        ],
      },
    ],
  },
  sw: {
    note: 'Ushauri wa jumla. Kilicho salama zaidi kinategemea unakoishi na nani anaweza kuangalia simu yako.',
    sections: [
      {
        id: 'lock',
        heading: 'Funga simu yako vizuri',
        paragraphs: [
          'Tumia nambari ya siri yenye tarakimu sita au zaidi, si mchoro, tarehe ya kuzaliwa wala nambari zinazojirudia. Weka skrini ijifunge baada ya dakika moja au chini.',
          'Ficha maudhui ya ujumbe kwenye skrini iliyofungwa, ili mtu yeyote asiweze kusoma arifa zako.',
        ],
      },
      {
        id: 'updates',
        heading: 'Iweke ikiwa ya kisasa',
        paragraphs: [
          'Sakinisha masasisho ya simu na programu mara tu yanapofika. Masasisho mengi hurekebisha mianya ya usalama ambayo tayari inatumiwa.',
          'Sakinisha programu kutoka duka rasmi pekee, na ondoa programu usizotumia tena.',
        ],
      },
      {
        id: 'accounts',
        heading: 'Linda akaunti zako',
        paragraphs: [
          'Tumia nenosiri tofauti kwa kila akaunti. Kidhibiti cha manenosiri kinaweza kukukumbukia.',
          'Washa uthibitishaji wa hatua mbili. Programu ya kithibitishaji ni salama zaidi kuliko misimbo inayotumwa kwa SMS, ambayo inaweza kunaswa au kuelekezwa kwingine.',
        ],
      },
      {
        id: 'messages',
        heading: 'Zungumza kwa faragha',
        paragraphs: [
          'Tumia programu zenye usimbaji fiche wa mwanzo hadi mwisho, na washa ujumbe unaopotea. Kumbuka kwamba mtu mwingine bado anaweza kupiga picha ya skrini, na simu yake pia inaweza kukaguliwa.',
          'Kabla ya kutuma picha, fikiria kilichomo: nyuso, michoro ya mwili, alama za barabarani au chochote kinachoweza kukutambulisha wewe au mtu mwingine.',
        ],
      },
      {
        id: 'photos',
        heading: 'Picha na mahali',
        paragraphs: [
          'Picha zinaweza kubeba mahali zilipopigwa. Zima mahali kwa kamera, au uondoe kabla ya kushiriki. Tero huiondoa kwa ajili yako.',
          'Angalia programu zipi zinaweza kuona mahali ulipo, na uziruhusu tu wakati unazitumia.',
        ],
      },
      {
        id: 'checked',
        heading: 'Mtu akikagua simu yako',
        paragraphs: [
          'Fikiria mapema kilicho kwenye simu yako. Programu, mazungumzo ya zamani na picha chache humaanisha machache ya kupatikana.',
          'Tero ina nambari ya siri ya kudanganya. Ukilazimishwa kuifungua, inaonyesha mwonekano wa kawaida usio na chochote chako.',
          'Katika baadhi ya nchi, kutumia VPN au programu fulani huvutia macho au ni kinyume cha sheria. Jua kinachotumika unakoishi kabla ya kuvitegemea.',
        ],
      },
    ],
  },
  zh: {
    note: '一般性建议。什么最安全取决于你住在哪里，以及谁可能查看你的手机。',
    sections: [
      {
        id: 'lock',
        heading: '锁好你的手机',
        paragraphs: [
          '使用至少六位数的密码，不要用图案、生日或重复的数字。把屏幕设置为一分钟或更短时间后自动锁定。',
          '在锁屏上隐藏消息预览，这样别人就无法从你身后或在手机锁定时读到你的通知。',
        ],
      },
      {
        id: 'updates',
        heading: '保持更新',
        paragraphs: [
          '手机和应用的更新一到就尽快安装。大多数更新修复的是已经被利用的安全漏洞。',
          '只从官方应用商店安装应用，并删除不再使用的应用。',
        ],
      },
      {
        id: 'accounts',
        heading: '保护你的账户',
        paragraphs: [
          '每个账户使用不同的密码。密码管理器可以帮你记住它们。',
          '开启两步验证。身份验证器应用比短信验证码更安全，短信可能被拦截或转发。',
        ],
      },
      {
        id: 'messages',
        heading: '私密交谈',
        paragraphs: [
          '使用端到端加密的应用，并开启消息自动消失。记住，对方仍然可以截图，他们的手机也可能被检查。',
          '发送照片前，想想照片里有什么：面孔、纹身、路牌，或任何可能认出你或他人的东西。',
        ],
      },
      {
        id: 'photos',
        heading: '照片与位置',
        paragraphs: [
          '照片可能带有拍摄地点。关闭相机的定位，或在分享前删除位置信息。Tero 会替你删除。',
          '检查哪些应用可以看到你的位置，只在使用时允许。',
        ],
      },
      {
        id: 'checked',
        heading: '如果有人检查你的手机',
        paragraphs: [
          '提前想想手机里有什么。应用、旧聊天和照片越少，别人能找到的就越少。',
          'Tero 有一个伪装密码。如果你被迫打开它，伪装密码会显示一个普通界面，里面没有任何属于你的东西。',
          '在一些国家，使用 VPN 或某些应用会引人注意，甚至违法。依赖它们之前，先了解你所在地的规定。',
        ],
      },
    ],
  },
  fr: {
    note: 'Conseils généraux. Ce qui est le plus sûr dépend de l’endroit où tu vis et de qui pourrait regarder ton téléphone.',
    sections: [
      {
        id: 'lock',
        heading: 'Bien verrouiller ton téléphone',
        paragraphs: [
          'Utilise un code d’au moins six chiffres, pas un schéma, une date de naissance ou un chiffre répété. Règle le verrouillage automatique à une minute ou moins.',
          'Masque l’aperçu des messages sur l’écran verrouillé, pour que personne ne puisse lire tes notifications par-dessus ton épaule.',
        ],
      },
      {
        id: 'updates',
        heading: 'Le garder à jour',
        paragraphs: [
          'Installe les mises à jour du téléphone et des applis dès qu’elles arrivent. La plupart corrigent des failles déjà exploitées.',
          'N’installe des applis que depuis la boutique officielle, et supprime celles que tu n’utilises plus.',
        ],
      },
      {
        id: 'accounts',
        heading: 'Protéger tes comptes',
        paragraphs: [
          'Utilise un mot de passe différent pour chaque compte. Un gestionnaire de mots de passe peut les retenir pour toi.',
          'Active la validation en deux étapes. Une appli d’authentification est plus sûre que les codes par SMS, qui peuvent être interceptés ou détournés.',
        ],
      },
      {
        id: 'messages',
        heading: 'Parler en privé',
        paragraphs: [
          'Utilise des applis chiffrées de bout en bout, et active les messages éphémères. N’oublie pas que l’autre personne peut toujours faire une capture d’écran, et que son téléphone peut aussi être fouillé.',
          'Avant d’envoyer une photo, pense à ce qu’elle montre : visages, tatouages, panneaux de rue ou tout ce qui pourrait t’identifier, toi ou quelqu’un d’autre.',
        ],
      },
      {
        id: 'photos',
        heading: 'Photos et localisation',
        paragraphs: [
          'Les photos peuvent contenir l’endroit où elles ont été prises. Désactive la localisation de l’appareil photo, ou retire-la avant de partager. Tero la retire pour toi.',
          'Vérifie quelles applis peuvent voir ta position, et ne l’autorise que pendant leur utilisation.',
        ],
      },
      {
        id: 'checked',
        heading: 'Si quelqu’un fouille ton téléphone',
        paragraphs: [
          'Pense à l’avance à ce qu’il y a sur ton téléphone. Moins d’applis, de vieilles discussions et de photos, c’est moins de choses à trouver.',
          'Tero a un code leurre. Si on te force à l’ouvrir, le leurre affiche une vue simple sans rien de toi.',
          'Dans certains pays, utiliser un VPN ou certaines applis attire l’attention ou est illégal. Renseigne-toi sur ce qui s’applique chez toi avant de compter dessus.',
        ],
      },
    ],
  },
};
