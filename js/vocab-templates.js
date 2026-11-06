// vocab-templates.js —— 词汇 CSV 模板的唯一事实来源（issue #6）
// 应用内「下载模板」按钮与仓库 templates/*.csv 都由本文件派生：
//   - 渲染端：renderer.js generateTemplate() 直接返回这里的内容
//   - 仓库 CSV：node scripts/gen_templates.js 重新生成（CI 校验 git diff 防漂移）
// category key 必须与各 words/*.js 的 categories 保持一致。
(function () {
  'use strict';

  const TEMPLATES = {
    fr: `word,meaning,phonetic,category,difficulty
bonjour,你好,/bɔ̃ʒuʁ/,salutations,1
merci,谢谢,/mɛʁsi/,salutations,1
bonsoir,晚上好,/bɔ̃swaʁ/,salutations,1
croissant,羊角面包,/kʁwasɑ̃/,nourriture,1
fromage,奶酪,/fʁɔmaʒ/,nourriture,1
baguette,法棍,/baɡɛt/,nourriture,1
voyage,旅行,/vwajaʒ/,voyage,2
avion,飞机,/avjɔ̃/,voyage,2
gare,火车站,/ɡaʁ/,voyage,1
un,一,/œ̃/,nombres,1
deux,二,/dø/,nombres,1
trois,三,/tʁwa/,nombres,1
mère,母亲,/mɛʁ/,famille,1
père,父亲,/pɛʁ/,famille,1
rouge,红色,/ʁuʒ/,couleurs,1
bleu,蓝色,/blø/,couleurs,1
tête,头,/tɛt/,corps,1
main,手,/mɛ̃/,corps,1
soleil,太阳,/sɔlɛj/,meteo,1
pluie,雨,/plɥi/,meteo,1
maison,家,/mɛzɔ̃/,quotidien,1
travail,工作,/tʁavaj/,quotidien,2
heureux,幸福的,/øʁø/,emotions,2
triste,悲伤的,/tʁist/,emotions,2
bibliothèque,图书馆,/biblijɔtɛk/,quotidien,2
développement,发展,/devlɔpmɑ̃/,emotions,3
`,

    es: `word,meaning,phonetic,category,difficulty
hola,你好,/ola/,saludos,1
gracias,谢谢,/ɡɾaθjas/,saludos,1
buenos días,早上好,/bwenos dias/,saludos,1
tortilla,西班牙土豆饼,/toɾtiʎa/,comida,1
paella,海鲜饭,/paeʎa/,comida,2
jamón,火腿,/xamon/,comida,1
viaje,旅行,/biaxe/,viaje,2
avión,飞机,/abion/,viaje,2
tren,火车,/tɾen/,viaje,1
uno,一,/uno/,numeros,1
dos,二,/dos/,numeros,1
tres,三,/tɾen/,numeros,1
madre,母亲,/madɾe/,familia,1
padre,父亲,/padɾe/,familia,1
rojo,红色,/roxo/,colores,1
azul,蓝色,/aθul/,colores,1
cabeza,头,/kaβeθa/,cuerpo,1
mano,手,/mano/,cuerpo,1
sol,太阳,/sol/,clima,1
lluvia,雨,/ʎubia/,clima,1
casa,家,/kasa/,diario,1
trabajo,工作,/tɾabaxo/,diario,2
feliz,幸福的,/feliθ/,emociones,2
triste,悲伤的,/tɾiste/,emociones,2
biblioteca,图书馆,/bibljoˈteka/,diario,2
desarrollo,发展,/desaˈroʎo/,emociones,3
`,

    it: `word,meaning,phonetic,category,difficulty
ciao,你好,/tʃao/,saluti,1
grazie,谢谢,/ˈɡrattsje/,saluti,1
buongiorno,早上好,/bwonˈdʒorno/,saluti,1
pizza,披萨,/ˈpittsa/,cibo,1
pasta,意面,/ˈpasta/,cibo,1
gelato,冰淇淋,/dʒeˈlaːto/,cibo,1
viaggio,旅行,/viˈaddʒo/,viaggio,2
aereo,飞机,/aˈɛːreo/,viaggio,2
treno,火车,/ˈtreːno/,viaggio,1
uno,一,/ˈuːno/,numeri,1
due,二,/ˈduːe/,numeri,1
tre,三,/ˈtreːe/,numeri,1
madre,母亲,/ˈmaːdre/,famiglia,1
padre,父亲,/ˈpaːdre/,famiglia,1
rosso,红色,/ˈrosso/,colori,1
blu,蓝色,/blu/,colori,1
testa,头,/ˈtɛsta/,corpo,1
mano,手,/ˈmaːno/,corpo,1
sole,太阳,/ˈsoːle/,tempo,1
pioggia,雨,/ˈpjoːddʒa/,tempo,1
casa,家,/ˈkaːza/,quotidiano,1
lavoro,工作,/laˈvoːro/,quotidiano,2
felice,幸福的,/feˈliːtʃe/,emozioni,2
triste,悲伤的,/ˈtriste/,emozioni,2
biblioteca,图书馆,/biblioˈteːka/,quotidiano,2
sviluppo,发展,/zviˈluppo/,emozioni,3
`,

    pt: `word,meaning,phonetic,category,difficulty
olá,你好,/ɔˈla/,saudacoes,1
obrigado,谢谢,/obɾiˈɡadu/,saudacoes,1
bom dia,早上好,/bõ ˈdia/,saudacoes,1
feijoada,黑豆炖肉,/fej.ʒuˈa.dɐ/,comida,2
pão,面包,/pɐ̃w̃/,comida,1
bacalhau,鳕鱼,/bakaˈʎaw/,comida,2
viagem,旅行,/viˈaʒẽj/,viagem,2
avião,飞机,/aviˈɐ̃w̃/,viagem,2
comboio,火车,/kõˈboju/,viagem,2
um,一,/ũ/,numeros,1
dois,二,/dojʃ/,numeros,1
três,三,/tɾeʃ/,numeros,1
mãe,母亲,/mɐ̃j̃/,familia,1
pai,父亲,/paj/,familia,1
vermelho,红色,/veɾˈmeʎu/,cores,1
azul,蓝色,/aˈzul/,cores,1
cabeça,头,/kaˈbesa/,corpo,1
mão,手,/mɐ̃w̃/,corpo,1
sol,太阳,/sɔl/,clima,1
chuva,雨,/ˈʃuvɐ/,clima,1
casa,家,/ˈkazɐ/,diario,1
trabalho,工作,/tɾaˈbaʎu/,diario,2
feliz,幸福的,/fɛˈliʃ/,emocoes,2
triste,悲伤的,/ˈtɾiʃtɛ/,emocoes,2
biblioteca,图书馆,/bi.bli.uˈtɛ.kɐ/,diario,2
desenvolvimento,发展,/de.ʒɨ.vɔl.viˈmẽ.tu/,emocoes,4
`,

    ru: `word,meaning,phonetic,category,difficulty
привет,你好,/prʲɪˈvʲet/,privetstviya,1
спасибо,谢谢,/spɐˈsʲibə/,privetstviya,1
доброе утро,早上好,/ˈdobrəje ˈutrə/,privetstviya,1
борщ,罗宋汤,/borɕ/,eda,2
пирог,馅饼,/pʲɪˈrok/,eda,1
водка,伏特加,/ˈvotkə/,eda,1
путешествие,旅行,/pʊtʲɪˈʂɛstvʲɪje/,puteshestviya,3
самолёт,飞机,/səmɐˈlʲot/,puteshestviya,2
поезд,火车,/ˈpojest/,puteshestviya,1
один,一,/ɐˈdʲin/,chisla,1
два,二,/dva/,chisla,1
три,三,/trʲi/,chisla,1
мать,母亲,/matʲ/,semia,1
отец,父亲,/ɐˈtʲet͡s/,semia,1
красный,红色,/ˈkrasnɨj/,tsveta,1
синий,蓝色,/ˈsʲinʲɪj/,tsveta,1
голова,头,/ɡəɫɐˈva/,telo,1
рука,手,/rʊˈka/,telo,1
солнце,太阳,/ˈsont͡sə/,pogoda,1
дождь,雨,/doʂtʲ/,pogoda,1
дом,家,/dom/,povsednevnoe,1
работа,工作,/rɐˈbotə/,povsednevnoe,2
счастливый,幸福的,/ˈɕːæsʲlʲɪvɨj/,emotsii,3
грустный,悲伤的,/ˈɡrustnɨj/,emotsii,2
библиотека,图书馆,/bʲɪblʲɪɐˈtʲekə/,povsednevnoe,2
развитие,发展,/rɐzˈvʲitʲɪje/,emotsii,3
`,

    de: `word,meaning,phonetic,category,difficulty
hallo,你好,/ˈhalo/,begruessung,1
danke,谢谢,/ˈdaŋkə/,begruessung,1
bitte,请,/ˈbɪtə/,begruessung,1
tschüss,再见,/tʃʏs/,begruessung,1
guten Tag,你好,/ˈɡuːtn̩ taːk/,begruessung,1
Wasser,水,/ˈvasɐ/,essen,1
Brot,面包,/bʁoːt/,essen,1
Käse,奶酪,/ˈkɛːzə/,essen,1
Brötchen,小面包,/ˈbʁøːtçn̩/,essen,2
Wurst,香肠,/vʊʁst/,essen,1
Reise,旅行,/ˈʁaɪ̯zə/,reisen,2
Hotel,酒店,/hoˈtɛl/,reisen,1
Straße,街道,/ˈʃtʁaːsə/,reisen,2
Bibliothek,图书馆,/biblioˈteːk/,reisen,3
eins,一,/aɪ̯ns/,zahlen,1
zwei,二,/tsvaɪ̯/,zahlen,1
fünf,五,/fʏnf/,zahlen,1
zwölf,十二,/tsvɛlf/,zahlen,2
Mutter,母亲,/ˈmʊtɐ/,familie,1
Vater,父亲,/ˈfaːtɐ/,familie,1
Mädchen,女孩,/ˈmɛːtçn̩/,familie,2
rot,红色,/ʁoːt/,farben,1
grün,绿色,/ɡʁyːn/,farben,1
blau,蓝色,/blaʊ̯/,farben,1
Kopf,头,/kɔpf/,koerper,1
Hand,手,/hant/,koerper,1
Fuß,脚,/fuːs/,koerper,1
Sonne,太阳,/ˈzɔnə/,wetter,1
Regen,雨,/ˈʁeːɡn̩/,wetter,1
Schnee,雪,/ʃneː/,wetter,1
Haus,房子,/haʊ̯s/,alltag,1
Buch,书,/buːx/,alltag,1
Schlüssel,钥匙,/ˈʃlʏsl̩/,alltag,3
glücklich,快乐的,/ˈɡlʏklɪç/,gefuehle,3
schön,美丽的,/ʃøːn/,gefuehle,2
Grüße,问候,/ˈɡʁyːsə/,begruessung,3
`,

    ja: `word,reading,romaji,meaning,level,category,difficulty
私,わたし,watashi,我,N5,noun_basic,1
人,ひと,hito,人,N5,noun_basic,1
友達,ともだち,tomodachi,朋友,N5,noun_basic,1
食べる,たべる,taberu,吃,N5,verb_2,1
飲む,のむ,nomu,喝,N5,verb_1,1
行く,いく,iku,去,N5,verb_1,1
来る,くる,kuru,来,N5,verb_3,1
美しい,うつくしい,utsukushii,美丽的,N3,adjective_i,3
元気,げんき,genki,精神好,N5,adjective_na,1
静か,しずか,shizuka,安静的,N5,adjective_na,1
図書館,としょかん,toshokan,图书馆,N3,noun_nature,3
学校,がっこう,gakkou,学校,N5,noun_nature,1
天気,てんき,tenki,天气,N5,noun_abstract,1
料理,りょうり,ryouri,料理,N4,noun_abstract,2
勉強,べんきょう,benkyou,学习,N5,noun_abstract,1
とても,とても,totemo,非常,N5,adverb,1
少し,すこし,sukoshi,一点,N5,adverb,1
おはよう,おはよう,ohayou,早上好,N5,expression,1
ありがとう,ありがとう,arigatou,谢谢,N5,expression,1
一つ,ひとつ,hitotsu,一个,N5,counter,1
二つ,ふたつ,futatsu,两个,N5,counter,1
`,
  };

  const FILE_NAMES = { fr: 'french', es: 'spanish', it: 'italian', pt: 'portuguese', ru: 'russian', de: 'german', ja: 'japanese' };

  (typeof window !== 'undefined' ? window : globalThis).VOCAB_TEMPLATES = { TEMPLATES, FILE_NAMES };
})();
