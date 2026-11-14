const safeStorage={
 getItem(key){try{return window.localStorage.getItem(key)}catch(_){return null}},
 setItem(key,value){try{window.localStorage.setItem(key,String(value));return true}catch(_){return false}},
 removeItem(key){try{window.localStorage.removeItem(key);return true}catch(_){return false}},
 keys(){try{return Object.keys(window.localStorage)}catch(_){return []}}
};
// Remove the legacy per-user anime collection left by older versions.
safeStorage.removeItem('aqw-collection');
const API='https://graphql.anilist.co';
let lang=safeStorage.getItem('aqw-language')||'ja';
const T={ja:{countLabel:'問題数',reviewMissed:'間違えた問題を復習',bestRecord:'最高記録',runs:'プレイ回数',welcome:'はじめに、表示言語を選択してください。',choose:'言語を選択',heroTitle:'あなたのアニメ知識、<br>試してみよう。',heroDescription:'作品ビジュアルからタイトルを当てるクイズに挑戦。気になる作品を検索して、新しいアニメとの出会いも見つけよう。',quizTab:'クイズ',searchTab:'検索',quizHeading:'この作品のタイトルは？',loading:'作品データを読み込んでいます…',answerPrompt:'画像を見て、正しい作品名を選択してください。',start:'クイズを開始',retry:'再読み込みして開始',next:'次の問題',resultHeading:'クイズ終了',restart:'もう一度挑戦',searchHeading:'作品を検索',searchDescription:'作品名を入力して、作品情報を検索できます。',placeholder:'例：葬送のフリーレン',searchButton:'検索',footerText:'作品情報・画像は外部の作品データサービスから取得しています。非公式のファンサイトであり、各作品の権利は権利者に帰属します。利用にはインターネット接続が必要です。',footerText2:'のデータを利用しています。',preparing:'準備中',score:'スコア',loaded:'作品を読み込みました。クイズを開始できます。',loadError:'作品データを読み込めませんでした。ネット接続を確認して再試行してください。',correct:'正解！',right:'正解は「',finish:'結果を見る',completed:'完了',searching:'検索中…',notFound:'作品が見つかりませんでした。',items:'件の作品',apiError:'作品データを取得できませんでした。時間をおいて再試行してください。',titleAlt:'のビジュアル',yearUnknown:'年不明',episodesUnknown:'話数不明',rating:'評価'},en:{countLabel:'Questions',reviewMissed:'Review missed questions',bestRecord:'Best accuracy',runs:'Runs played',welcome:'Please choose your display language to begin.',choose:'Choose your language',heroTitle:'How well do you know<br>your anime?',heroDescription:'Guess anime titles from their artwork, or search for series and discover something new.',quizTab:'Take a Quiz',searchTab:'Search Anime',quizHeading:'Which anime is this?',loading:'Loading anime data…',answerPrompt:'Look at the artwork and choose the correct title.',start:'Start Quiz',retry:'Retry loading',next:'Next Question',resultHeading:'Quiz Complete',restart:'Play Again',searchHeading:'Search Anime',searchDescription:'Search anime by title.',placeholder:'e.g. Frieren: Beyond Journey’s End',searchButton:'Search',footerText:'Anime data and images are provided by an external anime database service. This is an unofficial fan site; all rights belong to their respective owners. An internet connection is required.',footerText2:'Data provided by',preparing:'Loading…',score:'Score',loaded:' anime loaded. Ready to start!',loadError:'Could not load anime data. Check your connection and try again.',correct:'Correct!',right:'The correct answer is “',finish:'See Results',completed:'Complete',searching:'Searching…',notFound:'No anime found.',items:' results',apiError:'Could not fetch anime data. Please try again later.',titleAlt:' artwork',yearUnknown:'Year unknown',episodesUnknown:'Episodes unknown',rating:'Score'}};
function tr(k){return (T[lang]&&T[lang][k])||(T.en&&T.en[k])||(T.ja&&T.ja[k])||k}
const LANG_UI={ja:{language:'言語',heroTitle:'あなたのアニメ知識、<br>試してみよう。',heroDescription:'作品ビジュアルからタイトルを当てるクイズに挑戦。気になる作品を検索して、新しいアニメとの出会いも見つけよう。',quizTab:'クイズに挑戦',searchTab:'作品を検索',progressTab:'実績',rankingTab:'ランキング',playMode:'プレイ形式',normal:'通常クイズ',daily:'デイリーチャレンジ',endless:'エンドレス',rush:'スピードラッシュ（10問・各5秒）',mode:'出題形式',count:'問題数',image:'作品ビジュアル → 作品名',characterImage:'キャラ画像 → キャラ名',characterNameImage:'キャラ名 → キャラ画像',studio:'制作スタジオ → 作品名',synonym:'略称・別名 → 作品名',year:'公開／放送開始年 → 作品名',synopsis:'あらすじ → 作品名',titleSynopsis:'作品名 → あらすじ',mixed:'ランダム出題',typed:'入力式クイズ',answerTyping:'入力で回答する',submit:'回答する',typeAnswer:'回答を入力',hint:'ヒントを使う',searchHeading:'作品を検索',searchDescription:'作品名を入力して、作品情報を検索できます。',searchButton:'検索',progressHeading:'プレイ記録',missionHeading:'デイリークエスト',achievementHeading:'実績',resultHeading:'クイズ終了',restart:'もう一度挑戦',share:'結果を共有',download:'画像を保存',review:'間違えた問題を復習'},en:{language:'Language',heroTitle:'How well do you know<br>your anime?',heroDescription:'Guess anime titles from their artwork, or search for series and discover something new.',quizTab:'Take a Quiz',searchTab:'Search Anime',progressTab:'Progress',rankingTab:'Rankings',playMode:'Play mode',normal:'Normal Quiz',daily:'Daily Challenge',endless:'Endless',rush:'Speed Rush (10 questions · 5 sec each)',mode:'Quiz mode',count:'Questions',image:'Artwork → Anime',characterImage:'Character image → Character name',characterNameImage:'Character name → Character image',studio:'Studio → Anime',synonym:'Alias → Anime',year:'Release/broadcast year → Anime',synopsis:'Synopsis → Anime',titleSynopsis:'Anime → Synopsis',mixed:'Random',typed:'Typed-answer quiz',answerTyping:'Answer by typing',submit:'Submit answer',typeAnswer:'Type your answer',hint:'Use hint',searchHeading:'Search Anime',searchDescription:'Search anime by title.',searchButton:'Search',progressHeading:'Player Progress',missionHeading:'Daily Quests',achievementHeading:'Achievements',resultHeading:'Quiz Complete',restart:'Play Again',share:'Share result',download:'Save image',review:'Review missed questions'},ko:{language:'언어',heroTitle:'애니메이션 지식을<br>시험해 보세요!',heroDescription:'작품 이미지로 제목을 맞히고, 작품을 검색해 새로운 애니메이션을 발견하세요.',quizTab:'퀴즈 시작',searchTab:'작품 검색',progressTab:'기록',rankingTab:'랭킹',playMode:'플레이 방식',normal:'일반 퀴즈',daily:'오늘의 도전',endless:'무한 모드',rush:'스피드 러시 (10문제 · 각 5초)',mode:'문제 유형',count:'문제 수',image:'이미지 → 작품명',characterImage:'캐릭터 이미지 → 캐릭터 이름',characterNameImage:'캐릭터 이름 → 캐릭터 이미지',studio:'제작사 → 작품명',synonym:'별칭 → 작품명',year:'공개·방영 연도 → 작품명',synopsis:'줄거리 → 작품명',titleSynopsis:'작품명 → 줄거리',mixed:'무작위',typed:'직접 입력 퀴즈',answerTyping:'직접 입력하기',submit:'제출',typeAnswer:'답변 입력',hint:'힌트 사용',searchHeading:'작품 검색',searchDescription:'작품명을 입력해 정보를 검색하세요.',searchButton:'검색',progressHeading:'플레이 기록',missionHeading:'오늘의 미션',achievementHeading:'업적',resultHeading:'퀴즈 완료',restart:'다시 하기',share:'결과 공유',download:'결과 이미지 저장',review:'오답 복습'},zh:{language:'语言',heroTitle:'来测试一下你的<br>动漫知识吧！',heroDescription:'根据作品图片猜标题，或搜索作品，发现新的动漫。',quizTab:'开始答题',searchTab:'搜索作品',progressTab:'记录',rankingTab:'排行榜',playMode:'游戏模式',normal:'普通答题',daily:'每日挑战',endless:'无尽模式',rush:'极速挑战（10题·每题5秒）',mode:'题目类型',count:'题目数量',image:'图片 → 作品名',characterImage:'角色图片 → 角色名称',characterNameImage:'角色名称 → 角色图片',studio:'制作公司 → 作品名',synonym:'别名 → 作品名',year:'上映／播出年份 → 作品名',synopsis:'简介 → 作品名',titleSynopsis:'作品名 → 简介',mixed:'随机出题',typed:'输入答案问答',answerTyping:'输入答案',submit:'提交答案',typeAnswer:'输入答案',hint:'使用提示',searchHeading:'搜索作品',searchDescription:'输入作品名搜索相关信息。',searchButton:'搜索',progressHeading:'游戏记录',missionHeading:'每日任务',achievementHeading:'成就',resultHeading:'答题结束',restart:'再玩一次',share:'分享结果',download:'保存结果图片',review:'复习错题'},es:{language:'Idioma',heroTitle:'¿Cuánto sabes<br>de anime?',heroDescription:'Adivina títulos a partir de imágenes o busca series para descubrir nuevas obras.',quizTab:'Jugar',searchTab:'Buscar anime',progressTab:'Progreso',rankingTab:'Clasificación',playMode:'Modo de juego',normal:'Quiz normal',daily:'Desafío diario',endless:'Sin fin',rush:'Ráfaga rápida (10 preguntas · 5 s cada una)',mode:'Tipo de pregunta',count:'Número de preguntas',image:'Imagen → Anime',characterImage:'Imagen del personaje → Nombre',characterNameImage:'Nombre → Imagen del personaje',studio:'Estudio → Anime',synonym:'Alias → Anime',year:'Año de estreno/emisión → Anime',synopsis:'Sinopsis → Anime',titleSynopsis:'Anime → Sinopsis',mixed:'Aleatorio',typed:'Respuestas escritas',answerTyping:'Responder escribiendo',submit:'Enviar',typeAnswer:'Escribe tu respuesta',hint:'Usar pista',searchHeading:'Buscar anime',searchDescription:'Busca información por título.',searchButton:'Buscar',progressHeading:'Progreso',missionHeading:'Misiones diarias',achievementHeading:'Logros',resultHeading:'Quiz terminado',restart:'Jugar otra vez',share:'Compartir resultado',download:'Guardar imagen',review:'Repasar errores'},fr:{language:'Langue',heroTitle:'Testez vos connaissances<br>en anime !',heroDescription:'Devinez les titres à partir des images ou recherchez des séries pour en découvrir de nouvelles.',quizTab:'Jouer',searchTab:'Rechercher un anime',progressTab:'Progression',rankingTab:'Classement',playMode:'Mode de jeu',normal:'Quiz classique',daily:'Défi quotidien',endless:'Sans fin',rush:'Défi éclair (10 questions · 5 s chacune)',mode:'Type de question',count:'Nombre de questions',image:'Image → Anime',characterImage:'Image du personnage → Nom',characterNameImage:'Nom → Image du personnage',studio:'Studio → Anime',synonym:'Alias → Anime',year:'Année de sortie/diffusion → Anime',synopsis:'Synopsis → Anime',titleSynopsis:'Anime → Synopsis',mixed:'Aléatoire',typed:'Réponses écrites',answerTyping:'Répondre par écrit',submit:'Valider',typeAnswer:'Saisissez votre réponse',hint:'Utiliser un indice',searchHeading:'Rechercher un anime',searchDescription:'Recherchez des informations par titre.',searchButton:'Rechercher',progressHeading:'Progression',missionHeading:'Missions quotidiennes',achievementHeading:'Succès',resultHeading:'Quiz terminé',restart:'Rejouer',share:'Partager le résultat',download:'Enregistrer l’image',review:'Revoir les erreurs'},pt:{language:'Idioma',heroTitle:'Teste seus conhecimentos<br>de anime!',heroDescription:'Adivinhe títulos pelas imagens ou pesquise séries para descobrir novos animes.',quizTab:'Jogar',searchTab:'Buscar anime',progressTab:'Progresso',rankingTab:'Classificação',playMode:'Modo de jogo',normal:'Quiz normal',daily:'Desafio diário',endless:'Infinito',rush:'Desafio relâmpago (10 perguntas · 5 s cada)',mode:'Tipo de pergunta',count:'Número de perguntas',image:'Imagem → Anime',characterImage:'Imagem do personagem → Nome',characterNameImage:'Nome → Imagem do personagem',studio:'Estúdio → Anime',synonym:'Apelido → Anime',year:'Ano de lançamento/transmissão → Anime',synopsis:'Sinopse → Anime',titleSynopsis:'Anime → Sinopse',mixed:'Aleatório',typed:'Respostas digitadas',answerTyping:'Responder digitando',submit:'Enviar resposta',typeAnswer:'Digite sua resposta',hint:'Usar dica',searchHeading:'Buscar anime',searchDescription:'Pesquise informações pelo título.',searchButton:'Buscar',progressHeading:'Progresso',missionHeading:'Missões diárias',achievementHeading:'Conquistas',resultHeading:'Quiz concluído',restart:'Jogar novamente',share:'Compartilhar resultado',download:'Salvar imagem',review:'Revisar erros'},de:{language:'Sprache',heroTitle:'Wie gut kennst du<br>deine Anime?',heroDescription:'Errate Anime anhand ihrer Bilder oder suche Serien und entdecke neue Titel.',quizTab:'Quiz spielen',searchTab:'Anime suchen',progressTab:'Fortschritt',rankingTab:'Rangliste',playMode:'Spielmodus',normal:'Normales Quiz',daily:'Tägliche Herausforderung',endless:'Endlos',rush:'Speed-Rush (10 Fragen · je 5 Sek.)',mode:'Fragetyp',count:'Fragenanzahl',image:'Bild → Anime',characterImage:'Figurenbild → Figurenname',characterNameImage:'Figurenname → Figurenbild',studio:'Studio → Anime',synonym:'Alias → Anime',titleYear:'Anime → Veröffentlichungs-/Ausstrahlungsjahr',titleStudio:'Anime → Studio',synopsis:'Zusammenfassung → Anime',titleSynopsis:'Anime → Zusammenfassung',mixed:'Zufällig',typed:'Antworten eintippen',answerTyping:'Antwort eintippen',submit:'Absenden',typeAnswer:'Antwort eingeben',hint:'Hinweis verwenden',searchHeading:'Anime suchen',searchDescription:'Suche nach Titel.',searchButton:'Suchen',progressHeading:'Spielverlauf',missionHeading:'Tägliche Aufgaben',achievementHeading:'Erfolge',resultHeading:'Quiz beendet',restart:'Erneut spielen',share:'Ergebnis teilen',download:'Ergebnisbild speichern',review:'Falsche Antworten wiederholen'}};
function setDocumentLanguage(){document.documentElement.lang=lang;document.title=({ja:'アニメクイズワールド',en:'Anime Quiz World',ko:'애니메이션 퀴즈 월드',zh:'动漫问答世界',es:'Mundo de Quiz de Anime',fr:'Monde Quiz Anime',pt:'Mundo de Quiz de Anime',de:'Anime-Quizwelt'}[lang]||'Anime Quiz World')}
function selectLanguage(l){const next=LANG_UI[l]?l:'ja';if(next===lang)return;const active=!document.getElementById('quizArea').classList.contains('hidden')&&questions.length>0;const prompt=document.getElementById('answerPrompt'),feedback=document.getElementById('feedback');const questionView=active?{promptText:prompt?.textContent,promptWhiteSpace:prompt?.style.whiteSpace,promptPadding:prompt?.style.padding,promptBackground:prompt?.style.background,promptBorderRadius:prompt?.style.borderRadius,feedbackText:feedback?.textContent,feedbackColor:feedback?.style.color}:null;lang=next;safeStorage.setItem('aqw-language',lang);setDocumentLanguage();const sel=document.getElementById('languageSelect');if(sel)sel.value=lang;applyLanguage();if(active){if(prompt&&questionView){prompt.textContent=questionView.promptText;prompt.style.whiteSpace=questionView.promptWhiteSpace;prompt.style.padding=questionView.promptPadding;prompt.style.background=questionView.promptBackground;prompt.style.borderRadius=questionView.promptBorderRadius}if(feedback&&questionView){feedback.textContent=questionView.feedbackText;feedback.style.color=questionView.feedbackColor}updateTimer();document.getElementById('score').textContent=tr('score')+' '+points;return}if(!pool.length)prepare();else{document.getElementById('progress').textContent=pool.length+(tr('loaded')||'');document.getElementById('start').classList.remove('hidden');document.getElementById('start').textContent=tr('start')}}
function restoreLanguage(){const saved=safeStorage.getItem('aqw-language');lang=LANG_UI[saved]?saved:'ja';setDocumentLanguage();const sel=document.getElementById('languageSelect');if(sel)sel.value=lang;applyLanguage();if(!pool.length)prepare()}
function applyLanguage(){const uiNow=LANG_UI[lang]||LANG_UI.en;const guideText=({ja:'遊び方・お知らせ',en:'Help & News',ko:'이용 안내·공지',zh:'使用指南与公告',es:'Ayuda y noticias',fr:'Aide et actualités',pt:'Ajuda e novidades',de:'Hilfe & Neuigkeiten'}[lang]||'Help & News');const guideLink=document.getElementById('guideLink'),footerGuide=document.getElementById('footerGuide');if(guideLink)guideLink.textContent=guideText;if(footerGuide)footerGuide.textContent=guideText;const quitButton=document.getElementById('quitQuizButton');if(quitButton)quitButton.textContent=({ja:'やめる',en:'Quit',ko:'그만하기',zh:'退出',es:'Salir',fr:'Quitter',pt:'Sair',de:'Beenden'}[lang]||'Quit');updateDifficultyUI();const homeLogo=document.getElementById('homeLogo');if(homeLogo){homeLogo.setAttribute('aria-label',({ja:'ホームへ戻る',en:'Return to home',ko:'홈으로 돌아가기',zh:'返回首页',es:'Volver al inicio',fr:'Retour à l’accueil',pt:'Voltar ao início',de:'Zur Startseite'}[lang]||'Return to home'));homeLogo.title=homeLogo.getAttribute('aria-label')}const homeAfterQuiz=document.getElementById('homeAfterQuiz');if(homeAfterQuiz)homeAfterQuiz.textContent=({ja:'戻る',en:'Back',ko:'뒤로',zh:'返回',es:'Volver',fr:'Retour',pt:'Voltar',de:'Zurück'}[lang]||'Back');const shareBtn=document.getElementById('shareResult'),saveBtn=document.getElementById('downloadResult');if(shareBtn)shareBtn.textContent=uiNow.share||'Share result image';const answerToggleBtn=document.getElementById('toggleAnswerMode'),answerSubmitBtn=document.getElementById('submitTypedAnswer'),answerTypedLabel=document.getElementById('typedAnswerLabel');if(answerToggleBtn)answerToggleBtn.textContent=uiNow.answerTyping||'Answer by typing';if(answerSubmitBtn)answerSubmitBtn.textContent=uiNow.submit||'Submit answer';if(answerTypedLabel)answerTypedLabel.textContent=uiNow.typeAnswer||'Type your answer';const toggle=document.getElementById('toggleAnswerMode'),submit=document.getElementById('submitTypedAnswer'),typedLabel=document.getElementById('typedAnswerLabel'),hint=document.getElementById('hintButton'),typedHint=document.getElementById('typedHintButton'),typedUnknown=document.getElementById('typedUnknownAnswer');if(typedUnknown)typedUnknown.textContent=({ja:'わからない',en:"I don't know",ko:'모르겠어요',zh:'不知道',es:'No lo sé',fr:'Je ne sais pas',pt:'Não sei',de:'Ich weiß es nicht'}[lang]||"I don't know");if(toggle)toggle.textContent=uiNow.answerTyping||'Answer by typing';if(submit)submit.textContent=uiNow.submit||'Submit answer';if(typedLabel)typedLabel.textContent=uiNow.typeAnswer||'Type your answer';if(hint)hint.textContent=({ja:'四択用ヒント',en:'Multiple-choice hint',ko:'객관식 힌트',zh:'四选一提示',es:'Pista para opción múltiple',fr:'Indice QCM',pt:'Dica de múltipla escolha',de:'Multiple-Choice-Hinweis'}[lang]||'Multiple-choice hint');if(typedHint)typedHint.textContent=({ja:'入力用ヒント',en:'Typed-answer hint',ko:'직접 입력 힌트',zh:'输入题提示',es:'Pista para respuesta escrita',fr:'Indice pour réponse écrite',pt:'Dica para resposta digitada',de:'Hinweis für Texteingabe'}[lang]||'Typed-answer hint');if(saveBtn)saveBtn.textContent=uiNow.download||'Save result image';const labels=[uiNow.progressHeading,uiNow.missionHeading,uiNow.achievementHeading];['progressHeading','missionHeading','achievementHeading'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.textContent=labels[i]});const pt=document.getElementById('progressTab');if(pt)pt.textContent=uiNow.progressTab||'Progress & Collection';const pl=document.getElementById('playModeLabel');if(pl)pl.textContent=uiNow.playMode||'Play mode';const po=document.getElementById('playMode');if(po){const names=[uiNow.normal,uiNow.daily,uiNow.endless,uiNow.rush];[...po.options].forEach((o,i)=>o.textContent=names[i])}['countLabel','heroTitle','heroDescription','quizTab','searchTab','quizHeading','answerPrompt','start','resultHeading','restart','searchHeading','searchDescription','searchButton','footerText','footerText2'].forEach(k=>{let e=document.getElementById(k);if(e){if(k==='heroTitle')e.innerHTML=tr(k);else e.textContent=tr(k)}});const languageToggle=document.getElementById('languageToggle');if(languageToggle){const other=lang==='ja'?'en':'ja';languageToggle.textContent=lang==='ja'?'English':'日本語';languageToggle.setAttribute('aria-label',lang==='ja'?'Switch to English':'Switch to Japanese');languageToggle.title=lang==='ja'?'Switch to English':'Switch to Japanese'};document.getElementById('query').placeholder=tr('placeholder');if(!pool.length){document.getElementById('progress').textContent=tr('preparing');document.getElementById('score').textContent=tr('score')+' 0';}const localizedQuizModeLabels={
ja:{image:'作品ビジュアル → 作品名',synopsis:'あらすじ → 作品名',synonym:'略称・別名 → 作品名',studio:'制作スタジオ → 作品名',year:'公開／放送開始年 → 作品名',titleYear:'作品名 → 公開／放送開始年',titleStudio:'作品名 → 制作スタジオ',titleSynopsis:'作品名 → あらすじ',titleEpisodes:'作品名 → 話数',titleGenre:'作品名 → ジャンル',titleFormat:'作品名 → 作品形式',mixed:'ランダム出題',typed:'入力式クイズ'},
en:{image:'Artwork → Anime',synopsis:'Synopsis → Anime',synonym:'Alias → Anime',studio:'Studio → Anime',year:'Release/broadcast year → Anime',titleYear:'Anime → Release/broadcast year',titleStudio:'Anime → Studio',titleSynopsis:'Anime → Synopsis',titleEpisodes:'Anime → Episode count',titleGenre:'Anime → Genre',titleFormat:'Anime → Format',mixed:'Random',typed:'Typed-answer quiz'},
ko:{image:'이미지 → 작품명',synopsis:'줄거리 → 작품명',synonym:'별칭 → 작품명',studio:'제작사 → 작품명',year:'공개·방영 연도 → 작품명',titleYear:'작품명 → 공개·방영 연도',titleStudio:'작품명 → 제작사',titleSynopsis:'작품명 → 줄거리',titleEpisodes:'작품명 → 에피소드 수',titleGenre:'작품명 → 장르',titleFormat:'작품명 → 형식',mixed:'무작위',typed:'직접 입력 퀴즈'},
zh:{image:'图片 → 作品名',synopsis:'简介 → 作品名',synonym:'别名 → 作品名',studio:'制作公司 → 作品名',year:'上映／播出年份 → 作品名',titleYear:'作品名 → 上映／播出年份',titleStudio:'作品名 → 制作公司',titleSynopsis:'作品名 → 简介',titleEpisodes:'作品名 → 集数',titleGenre:'作品名 → 类型',titleFormat:'作品名 → 形式',mixed:'随机出题',typed:'输入答案'},
es:{image:'Imagen → Anime',synopsis:'Sinopsis → Anime',synonym:'Alias → Anime',studio:'Estudio → Anime',year:'Año de estreno/emisión → Anime',titleYear:'Anime → Año de estreno/emisión',titleStudio:'Anime → Estudio',titleSynopsis:'Anime → Sinopsis',titleEpisodes:'Anime → Episodios',titleGenre:'Anime → Género',titleFormat:'Anime → Formato',mixed:'Aleatorio',typed:'Respuesta escrita'},
fr:{image:'Image → Anime',synopsis:'Synopsis → Anime',synonym:'Alias → Anime',studio:'Studio → Anime',year:'Année de sortie/diffusion → Anime',titleYear:'Anime → Année de sortie/diffusion',titleStudio:'Anime → Studio',titleSynopsis:'Anime → Résumé',titleEpisodes:'Anime → Nombre d’épisodes',titleGenre:'Anime → Genre',titleFormat:'Anime → Format',mixed:'Aléatoire',typed:'Réponse écrite'},
pt:{image:'Imagem → Anime',synopsis:'Sinopse → Anime',synonym:'Apelido → Anime',studio:'Estúdio → Anime',year:'Ano de lançamento/transmissão → Anime',titleYear:'Anime → Ano de lançamento/transmissão',titleStudio:'Anime → Estúdio',titleSynopsis:'Anime → Sinopse',titleEpisodes:'Anime → Episódios',titleGenre:'Anime → Gênero',titleFormat:'Anime → Formato',mixed:'Aleatório',typed:'Resposta digitada'},
de:{image:'Bild → Anime',synopsis:'Zusammenfassung → Anime',synonym:'Alias → Anime',studio:'Studio → Anime',year:'Veröffentlichungs-/Ausstrahlungsjahr → Anime',titleYear:'Anime → Veröffentlichungs-/Ausstrahlungsjahr',titleStudio:'Anime → Studio',titleSynopsis:'Anime → Zusammenfassung',titleEpisodes:'Anime → Episodenanzahl',titleGenre:'Anime → Genre',titleFormat:'Anime → Format',mixed:'Zufällig',typed:'Antwort eintippen'}
};const labelsForMode=localizedQuizModeLabels[lang]||localizedQuizModeLabels.en;[...document.getElementById('modeSelect').options].forEach(o=>{if(labelsForMode[o.value])o.textContent=labelsForMode[o.value]});const modeGroupNames={ja:['作品を当てる','作品情報を当てる'],en:['Guess the anime','Anime information'],ko:['작품 맞히기','작품 정보'],zh:['猜作品','作品信息'],es:['Adivina el anime','Información del anime'],fr:['Deviner l’anime','Informations sur l’anime'],pt:['Adivinhe o anime','Informações do anime'],de:['Anime erraten','Anime-Informationen']};[...document.querySelectorAll('#modeSelect optgroup')].forEach((group,i)=>{if(modeGroupNames[lang]?.[i])group.label=modeGroupNames[lang][i]});updateQuestionCountUI();document.getElementById('modeLabel').textContent=({ja:'出題内容',en:'Question content',ko:'문제 내용',zh:'题目内容',es:'Contenido de la pregunta',fr:'Contenu de la question',pt:'Conteúdo da pergunta',de:'Frageninhalt'}[lang]||'Question content');const answerFormatNames={ja:{label:'回答方式',choices:'四択',typed:'入力式'},en:{label:'Answer format',choices:'Four choices',typed:'Type answer'},ko:{label:'답변 방식',choices:'객관식 4지선다',typed:'직접 입력'},zh:{label:'答题方式',choices:'四选一',typed:'输入答案'},es:{label:'Formato de respuesta',choices:'Cuatro opciones',typed:'Escribir respuesta'},fr:{label:'Format de réponse',choices:'QCM à quatre choix',typed:'Saisir la réponse'},pt:{label:'Formato da resposta',choices:'Quatro opções',typed:'Digitar resposta'},de:{label:'Antwortformat',choices:'Vier Antwortmöglichkeiten',typed:'Antwort eingeben'}}[lang]||{label:'Answer format',choices:'Four choices',typed:'Type answer'};const answerFormatLabel=document.getElementById('answerFormatLabel');if(answerFormatLabel)answerFormatLabel.textContent=answerFormatNames.label;const answerFormatSelect=document.getElementById('answerFormatSelect');if(answerFormatSelect)[...answerFormatSelect.options].forEach(o=>o.textContent=answerFormatNames[o.value]||o.textContent);
const ui=LANG_UI[lang]||LANG_UI.en;const put=(id,key)=>{const el=document.getElementById(id);if(el&&ui[key])el.textContent=ui[key]};
const languageLabel=document.getElementById('languageLabel');if(languageLabel)languageLabel.textContent='Language';const heroTitleEl=document.getElementById('heroTitle');if(heroTitleEl&&ui.heroTitle)heroTitleEl.innerHTML=ui.heroTitle;put('heroDescription','heroDescription');put('quizHeading','quizHeading');put('quizTab','quizTab');put('searchTab','searchTab');put('progressTab','progressTab');put('playModeLabel','playMode');put('modeLabel','mode');const modeContentLabel=document.getElementById('modeLabel');if(modeContentLabel)modeContentLabel.textContent=({ja:'出題内容',en:'Question content',ko:'문제 내용',zh:'题目内容',es:'Contenido de la pregunta',fr:'Contenu de la question',pt:'Conteúdo da pergunta',de:'Frageninhalt'}[lang]||'Question content');put('countLabel','count');const timeLimitUi={ja:{label:'1問の制限時間',unit:'秒'},en:{label:'Time limit per question',unit:'s'},ko:{label:'문제당 제한 시간',unit:'초'},zh:{label:'每题限时',unit:'秒'},es:{label:'Límite por pregunta',unit:'s'},fr:{label:'Temps par question',unit:'s'},pt:{label:'Limite por pergunta',unit:'s'},de:{label:'Zeitlimit pro Frage',unit:'s'}}[lang]||{label:'Time limit per question',unit:'s'};const timeLimitLabel=document.getElementById('timeLimitLabel');if(timeLimitLabel)timeLimitLabel.textContent=timeLimitUi.label;const timeLimitSelect=document.getElementById('timeLimitSelect');if(timeLimitSelect)[...timeLimitSelect.options].forEach(o=>o.textContent=o.value+timeLimitUi.unit);put('searchHeading','searchHeading');put('searchDescription','searchDescription');put('searchButton','searchButton');put('progressHeading','progressHeading');put('missionHeading','missionHeading');put('achievementHeading','achievementHeading');put('resultHeading','resultHeading');put('start','start');put('restart','restart');
const socialNames=({
ja:{tab:'AQW',heading:'AQW — アニメ好きのための交流スペース',description:'AQW独自のアカウントで投稿、返信、フォロー、いいね、クイズ結果の共有ができます。Animeciaとはアカウント・データを共有しません。',postTitle:'フレンドとのコメント・返信',postDescription:'AQW内で相互フォローのフレンドとコメント・返信ができます。',openCommunity:'コミュニティを開く',profileTitle:'プロフィール',profileDescription:'AQW内でプロフィールやフォローを管理できます。',openProfile:'プロフィールを開く',status:'メール認証が必要な場合があります。AQW独自のアカウントを利用します。',reset:'実績とプレイ記録をリセット',resetDescription:'プレイ回数、経験値、実績、連続日数、ミッション進捗をこのブラウザから消去します。'},
en:{tab:'AQW',heading:'AQW — Anime fan community',description:'Use an AQW account to post, reply, follow users, like posts, and share quiz results. Accounts and data are separate from Animecia.',postTitle:'Friend comments & replies',postDescription:'Comment and reply with friends who follow each other on AQW.',openCommunity:'Open community',profileTitle:'Profile',profileDescription:'Manage your profile and follows on AQW.',openProfile:'Open profile',status:'Email verification may be required. AQW uses its own accounts.',reset:'Reset achievements & progress',resetDescription:'Clears quiz runs, XP, achievements, streaks, and mission progress from this browser.'},
ko:{tab:'AQW',heading:'AQW — 애니메이션 팬 커뮤니티',description:'AQW 계정으로 게시물 작성, 답글, 팔로우, 좋아요, 퀴즈 결과 공유를 할 수 있습니다. Animecia와 계정 및 데이터는 별도로 관리됩니다.',postTitle:'친구 댓글 및 답글',postDescription:'AQW에서 서로 팔로우하는 친구와 댓글 및 답글을 주고받을 수 있습니다.',openCommunity:'커뮤니티 열기',profileTitle:'프로필',profileDescription:'AQW에서 프로필과 팔로우를 관리합니다.',openProfile:'프로필 열기',status:'이메일 인증이 필요할 수 있습니다. AQW 전용 계정을 사용합니다.',reset:'업적 및 기록 초기화',resetDescription:'이 브라우저의 플레이 기록, XP, 업적, 연속 기록 및 미션 진행 상황을 삭제합니다.'},
zh:{tab:'AQW',heading:'AQW — 动漫爱好者交流社区',description:'使用 AQW 独立账号发布内容、回复、关注用户、点赞并分享答题结果。AQW 与 Animecia 的账号和数据相互独立。',postTitle:'好友评论与回复',postDescription:'在 AQW 中与互相关注的好友评论和回复。',openCommunity:'打开社区',profileTitle:'个人资料',profileDescription:'在 AQW 中管理个人资料和关注关系。',openProfile:'打开个人资料',status:'可能需要验证电子邮件。请使用 AQW 独立账号。',reset:'重置成就与记录',resetDescription:'清除此浏览器中的答题次数、XP、成就、连续记录和每日任务进度。'},
es:{tab:'AQW',heading:'AQW — Comunidad de fans del anime',description:'Usa una cuenta de AQW para publicar, responder, seguir usuarios, indicar que te gustan las publicaciones y compartir resultados. Las cuentas y los datos son independientes de Animecia.',postTitle:'Comentarios y respuestas de amigos',postDescription:'Comenta e intercambia respuestas con amigos que se siguen mutuamente en AQW.',openCommunity:'Abrir comunidad',profileTitle:'Perfil',profileDescription:'Administra tu perfil y tus seguimientos en AQW.',openProfile:'Abrir perfil',status:'Es posible que se requiera verificar el correo electrónico. AQW utiliza cuentas propias.',reset:'Restablecer logros y progreso',resetDescription:'Borra de este navegador las partidas, XP, logros, racha y progreso de misiones.'},
fr:{tab:'AQW',heading:'AQW — Communauté de fans d’anime',description:'Utilisez un compte AQW pour publier, répondre, suivre des utilisateurs, aimer des publications et partager les résultats des quiz. Les comptes et données sont séparés d’Animecia.',postTitle:'Commentaires et réponses entre amis',postDescription:'Commentez et répondez aux amis qui se suivent mutuellement sur AQW.',openCommunity:'Ouvrir la communauté',profileTitle:'Profil',profileDescription:'Gérez votre profil et vos abonnements sur AQW.',openProfile:'Ouvrir le profil',status:'Une vérification par e-mail peut être nécessaire. AQW utilise ses propres comptes.',reset:'Réinitialiser les succès et la progression',resetDescription:'Efface de ce navigateur les parties, XP, succès, séries et progression des missions.'},
pt:{tab:'AQW',heading:'AQW — Comunidade de fãs de anime',description:'Use uma conta AQW para publicar, responder, seguir usuários, curtir publicações e compartilhar resultados dos quizzes. As contas e os dados são separados do Animecia.',postTitle:'Comentários e respostas entre amigos',postDescription:'Comente e responda a amigos que se seguem mutuamente no AQW.',openCommunity:'Abrir comunidade',profileTitle:'Perfil',profileDescription:'Gerencie seu perfil e quem você segue no AQW.',openProfile:'Abrir perfil',status:'Pode ser necessário verificar o e-mail. O AQW usa contas próprias.',reset:'Redefinir conquistas e progresso',resetDescription:'Apaga deste navegador as partidas, XP, conquistas, sequência e progresso das missões.'},
de:{tab:'AQW',heading:'AQW — Anime-Fan-Community',description:'Mit einem AQW-Konto kannst du Beiträge veröffentlichen, antworten, Nutzern folgen, Beiträge liken und Quiz-Ergebnisse teilen. Konten und Daten sind von Animecia getrennt.',postTitle:'Kommentare und Antworten von Freunden',postDescription:'Kommentiere und antworte Freunden, die sich auf AQW gegenseitig folgen.',openCommunity:'Community öffnen',profileTitle:'Profil',profileDescription:'Verwalte dein Profil und deine Abonnements auf AQW.',openProfile:'Profil öffnen',status:'Möglicherweise ist eine E-Mail-Bestätigung erforderlich. AQW verwendet eigene Konten.',reset:'Erfolge und Fortschritt zurücksetzen',resetDescription:'Entfernt Quizrunden, XP, Erfolge, Serien und Missionsfortschritt aus diesem Browser.'},countLabel:'문제 수',reviewMissed:'틀린 문제 복습',bestRecord:'최고 기록',runs:'플레이 횟수',welcome:'먼저 표시 언어를 선택하세요.',choose:'언어 선택',quizHeading:'애니메이션 퀴즈',loading:'불러오는 중…',answerPrompt:'정답을 선택하세요.',start:'퀴즈 시작',retry:'다시 시도',next:'다음 문제',placeholder:'애니메이션 제목 검색',footerText:'애니메이션 데이터와 이미지는 외부 애니메이션 데이터 서비스에서 제공됩니다. 비공식 팬 사이트입니다.',footerText2:'모든 권리는 각 권리자에게 있습니다.',preparing:'문제를 준비하는 중…',score:'점수',loaded:'작품을 불러왔습니다.',loadError:'데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.',correct:'정답!',right:'정답',finish:'결과 보기',completed:'완료',searching:'검색 중…',notFound:'검색 결과가 없습니다.',items:'개 작품',apiError:'데이터 서비스 연결 오류',titleAlt:'제목 없음',yearUnknown:'방영 연도 미상',episodesUnknown:'에피소드 수 미상',rating:'평가',socialHeading:'AQW — 애니메이션 팬 커뮤니티',socialDescription:'AQW 계정으로 게시물 작성, 답글, 팔로우, 좋아요, 퀴즈 결과 공유를 할 수 있습니다.'
})[lang]||({
tab:'AQW',heading:'AQW — Anime fan community',description:'Use an AQW account to post, reply, follow users, like posts, and share quiz results. Accounts and data are separate from Animecia.',postTitle:'Friend comments & replies',postDescription:'Comment and reply with friends who follow each other on AQW.',openCommunity:'Open community',profileTitle:'Profile',profileDescription:'Manage your profile and follows on AQW.',openProfile:'Open profile',status:'Email verification may be required. AQW uses its own accounts.',reset:'Reset achievements & progress',resetDescription:'Clears quiz runs, XP, achievements, streaks, and mission progress from this browser.'
});put('socialTab','tab');put('rankingTab','tab');put('socialHeading','heading');put('socialDescription','description');put('socialPostTitle','postTitle');put('socialPostDescription','postDescription');put('openCommunity','openCommunity');put('socialProfileTitle','profileTitle');put('socialProfileDescription','profileDescription');put('openProfile','openProfile');put('socialNextTitle','nextTitle');put('socialNextDescription','nextDescription');put('socialStatus','status');put('resetProgress','reset');put('resetDescription','resetDescription');put('shareResult','share');put('downloadResult','download');put('reviewMissed','review');put('toggleAnswerMode','answerTyping');put('submitTypedAnswer','submit');put('typedAnswerLabel','typeAnswer');put('hintButton','hint');
const play=document.getElementById('playMode');if(play)[...play.options].forEach(o=>{const k={normal:'normal',daily:'daily',endless:'endless',rush:'rush'}[o.value];if(ui[k])o.textContent=ui[k]});
const modeNames={image:'image',studio:'studio',synonym:'synonym',titleYear:'titleYear',titleStudio:'titleStudio',synopsis:'synopsis',titleSynopsis:'titleSynopsis',mixed:'mixed',typed:'typed'};const modeSel=document.getElementById('modeSelect');if(modeSel)[...modeSel.options].forEach(o=>{if(ui[modeNames[o.value]])o.textContent=ui[modeNames[o.value]]});
const foot=document.getElementById('footerText');if(foot&&lang!=='ja')foot.textContent=lang==='en'?'Anime data and images are provided by an external anime database service. This is an unofficial fan site; all rights belong to their respective owners. An internet connection is required.':({ko:'작품 데이터와 이미지는 외부 애니메이션 데이터베이스에서 제공합니다. 비공식 팬 사이트이며 모든 권리는 각 권리자에게 있습니다. 인터넷 연결이 필요합니다.',zh:'作品数据和图片来自外部动漫数据库。本网站为非官方粉丝网站，所有权利归各自权利人所有。需要连接互联网。',es:'Los datos e imágenes proceden de una base de datos externa. Este es un sitio de fans no oficial; los derechos pertenecen a sus respectivos titulares. Se requiere conexión a Internet.',fr:'Les données et images proviennent d’une base de données externe. Ce site de fans est non officiel ; tous les droits appartiennent à leurs détenteurs. Une connexion Internet est nécessaire.',pt:'Os dados e imagens vêm de uma base de dados externa. Este é um site de fãs não oficial; todos os direitos pertencem aos respetivos titulares. É necessária ligação à Internet.',de:'Anime-Daten und Bilder stammen aus einer externen Datenbank. Dies ist eine inoffizielle Fanseite; alle Rechte liegen bei den jeweiligen Rechteinhabern. Eine Internetverbindung ist erforderlich.'}[lang]||ui.heroDescription);const socialUI={
ja:{heading:'AQW — アニメ好きのための交流スペース',description:'AQW独自のアカウントで投稿、返信、フォロー、いいね、クイズ結果の共有ができます。Animeciaとはアカウント・データを共有しません。',status:'AQWのSNSを準備しています…',auth:'ログイン / 新規登録',username:'ユーザー名（登録時）',email:'メールアドレス',password:'パスワード',display:'表示名（登録時）',terms:'利用規約とプライバシーポリシーを確認し、同意します。',signin:'ログイン',signup:'新規登録はこちら',signout:'ログアウト',profile:'プロフィール',saveProfile:'プロフィールを保存',newPassword:'新しいパスワード',confirmPassword:'新しいパスワード（確認）',changePassword:'パスワードを変更',userSearch:'ユーザー検索・フレンド登録',userSearchDesc:'相手をフォローできます。お互いにフォローするとフレンドになり、1対1のチャットができます。',searchPlaceholder:'ユーザー名・表示名',search:'検索',friends:'フレンドとのチャット',friendList:'フレンド一覧',friendDesc:'相互にフォローしているユーザーが表示されます。',refreshFriends:'フレンド一覧を更新',chooseConversation:'チャットする相手を選択してください',messagePlaceholder:'メッセージを書く（最大2,000文字）',send:'送信',termsLink:'利用規約',privacyLink:'プライバシーポリシー'},
en:{heading:'AQW — Anime fan community',description:'Use an AQW account to post, reply, follow users, like posts, and share quiz results. Accounts and data are separate from Animecia.',status:'Preparing AQW community…',auth:'Sign in / Create account',username:'Username (registration)',email:'Email address',password:'Password',display:'Display name (registration)',terms:'I have read and agree to the Terms of Use and Privacy Policy.',signin:'Sign in',signup:'Create an account',signout:'Sign out',profile:'Profile',saveProfile:'Save profile',newPassword:'New password',confirmPassword:'Confirm new password',changePassword:'Change password',userSearch:'Find users and add friends',userSearchDesc:'Follow users. When you follow each other, you become friends and can chat one-to-one.',searchPlaceholder:'Username or display name',search:'Search',friends:'Chat with friends',friendList:'Friends',friendDesc:'Users who follow each other appear here.',refreshFriends:'Refresh friends',chooseConversation:'Select someone to chat with',messagePlaceholder:'Write a message (up to 2,000 characters)',send:'Send',termsLink:'Terms of Use',privacyLink:'Privacy Policy'},
ko:{heading:'AQW — 애니메이션 팬 커뮤니티',description:'AQW 계정으로 게시물 작성, 답글, 팔로우, 좋아요, 퀴즈 결과 공유를 할 수 있습니다. Animecia와 계정 및 데이터는 별도로 관리됩니다.',status:'AQW 커뮤니티 준비 중…',auth:'로그인 / 회원가입',username:'사용자 이름(가입 시)',email:'이메일 주소',password:'비밀번호',display:'표시 이름(가입 시)',terms:'이용약관과 개인정보 처리방침을 읽고 동의합니다.',signin:'로그인',signup:'회원가입',signout:'로그아웃',profile:'프로필',saveProfile:'프로필 저장',newPassword:'새 비밀번호',confirmPassword:'새 비밀번호 확인',changePassword:'비밀번호 변경',userSearch:'사용자 검색 및 친구 추가',userSearchDesc:'서로 팔로우하면 친구가 되어 댓글과 답글을 주고받을 수 있습니다.',searchPlaceholder:'사용자 이름 또는 표시 이름',search:'검색',friends:'친구 댓글 및 답글',friendList:'친구 목록',friendDesc:'서로 팔로우하는 사용자가 표시됩니다.',refreshFriends:'친구 목록 새로고침',chooseConversation:'대화를 선택하세요',messagePlaceholder:'댓글 작성(최대 2,000자)',send:'전송',termsLink:'이용약관',privacyLink:'개인정보 처리방침'},
zh:{heading:'AQW — 动漫爱好者社区',description:'使用 AQW 独立账号发布内容、回复、关注用户、点赞并分享答题结果。AQW 与 Animecia 的账号和数据相互独立。',status:'正在准备 AQW 社区…',auth:'登录 / 注册',username:'用户名（注册时填写）',email:'电子邮箱',password:'密码',display:'显示名称（注册时填写）',terms:'我已阅读并同意使用条款和隐私政策。',signin:'登录',signup:'创建账号',signout:'退出登录',profile:'个人资料',saveProfile:'保存个人资料',newPassword:'新密码',confirmPassword:'确认新密码',changePassword:'修改密码',userSearch:'搜索用户并添加好友',userSearchDesc:'互相关注后即可成为好友并互相评论、回复。',searchPlaceholder:'用户名或显示名称',search:'搜索',friends:'好友评论与回复',friendList:'好友列表',friendDesc:'这里会显示互相关注的用户。',refreshFriends:'刷新好友列表',chooseConversation:'请选择会话',messagePlaceholder:'写评论（最多 2,000 字）',send:'发送',termsLink:'使用条款',privacyLink:'隐私政策'},
es:{heading:'AQW — Comunidad de fans del anime',description:'Usa una cuenta de AQW para publicar, responder, seguir usuarios, indicar que te gustan las publicaciones y compartir resultados. Las cuentas y los datos son independientes de Animecia.',status:'Preparando la comunidad AQW…',auth:'Iniciar sesión / Registrarse',username:'Nombre de usuario (registro)',email:'Correo electrónico',password:'Contraseña',display:'Nombre visible (registro)',terms:'He leído y acepto los Términos de uso y la Política de privacidad.',signin:'Iniciar sesión',signup:'Crear cuenta',signout:'Cerrar sesión',profile:'Perfil',saveProfile:'Guardar perfil',newPassword:'Nueva contraseña',confirmPassword:'Confirmar nueva contraseña',changePassword:'Cambiar contraseña',userSearch:'Buscar usuarios y añadir amigos',userSearchDesc:'Seguidse mutuamente para ser amigos e intercambiar comentarios y respuestas.',searchPlaceholder:'Usuario o nombre visible',search:'Buscar',friends:'Comentarios y respuestas entre amigos',friendList:'Lista de amigos',friendDesc:'Aquí aparecen los usuarios que se siguen mutuamente.',refreshFriends:'Actualizar amigos',chooseConversation:'Selecciona una conversación',messagePlaceholder:'Escribe un comentario (máx. 2.000 caracteres)',send:'Enviar',termsLink:'Términos de uso',privacyLink:'Política de privacidad'},
fr:{heading:'AQW — Communauté de fans d’anime',description:'Utilisez un compte AQW pour publier, répondre, suivre des utilisateurs, aimer des publications et partager les résultats des quiz. Les comptes et données sont séparés d’Animecia.',status:'Préparation de la communauté AQW…',auth:'Connexion / Inscription',username:'Nom d’utilisateur (inscription)',email:'Adresse e-mail',password:'Mot de passe',display:'Nom affiché (inscription)',terms:'J’ai lu et j’accepte les conditions d’utilisation et la politique de confidentialité.',signin:'Se connecter',signup:'Créer un compte',signout:'Se déconnecter',profile:'Profil',saveProfile:'Enregistrer le profil',newPassword:'Nouveau mot de passe',confirmPassword:'Confirmer le nouveau mot de passe',changePassword:'Modifier le mot de passe',userSearch:'Rechercher des utilisateurs et ajouter des amis',userSearchDesc:'Suivez-vous mutuellement pour devenir amis et échanger des commentaires et des réponses.',searchPlaceholder:'Nom d’utilisateur ou nom affiché',search:'Rechercher',friends:'Commentaires et réponses entre amis',friendList:'Liste des amis',friendDesc:'Les utilisateurs qui se suivent mutuellement apparaissent ici.',refreshFriends:'Actualiser les amis',chooseConversation:'Sélectionnez une conversation',messagePlaceholder:'Écrire un commentaire (2 000 caractères max.)',send:'Envoyer',termsLink:'Conditions d’utilisation',privacyLink:'Politique de confidentialité'},
pt:{heading:'AQW — Comunidade de fãs de anime',description:'Use uma conta AQW para publicar, responder, seguir usuários, curtir publicações e compartilhar resultados dos quizzes. As contas e os dados são separados do Animecia.',status:'Preparando a comunidade AQW…',auth:'Entrar / Criar conta',username:'Nome de usuário (cadastro)',email:'E-mail',password:'Senha',display:'Nome de exibição (cadastro)',terms:'Li e aceito os Termos de Uso e a Política de Privacidade.',signin:'Entrar',signup:'Criar conta',signout:'Sair',profile:'Perfil',saveProfile:'Salvar perfil',newPassword:'Nova senha',confirmPassword:'Confirmar nova senha',changePassword:'Alterar senha',userSearch:'Buscar usuários e adicionar amigos',userSearchDesc:'Sigam-se mutuamente para se tornarem amigos e trocar comentários e respostas.',searchPlaceholder:'Nome de usuário ou nome de exibição',search:'Buscar',friends:'Comentários e respostas entre amigos',friendList:'Lista de amigos',friendDesc:'Usuários que se seguem mutuamente aparecem aqui.',refreshFriends:'Atualizar amigos',chooseConversation:'Selecione uma conversa',messagePlaceholder:'Escreva um comentário (até 2.000 caracteres)',send:'Enviar',termsLink:'Termos de Uso',privacyLink:'Política de Privacidade'},
de:{heading:'AQW — Anime-Fan-Community',description:'Mit einem AQW-Konto kannst du Beiträge veröffentlichen, antworten, Nutzern folgen, Beiträge liken und Quiz-Ergebnisse teilen. Konten und Daten sind von Animecia getrennt.',status:'AQW-Community wird vorbereitet…',auth:'Anmelden / Registrieren',username:'Benutzername (bei Registrierung)',email:'E-Mail-Adresse',password:'Passwort',display:'Anzeigename (bei Registrierung)',terms:'Ich habe die Nutzungsbedingungen und Datenschutzerklärung gelesen und stimme ihnen zu.',signin:'Anmelden',signup:'Konto erstellen',signout:'Abmelden',profile:'Profil',saveProfile:'Profil speichern',newPassword:'Neues Passwort',confirmPassword:'Neues Passwort bestätigen',changePassword:'Passwort ändern',userSearch:'Nutzer suchen und Freunde hinzufügen',userSearchDesc:'Folgt euch gegenseitig, um Freunde zu werden und Kommentare sowie Antworten auszutauschen.',searchPlaceholder:'Benutzername oder Anzeigename',search:'Suchen',friends:'Kommentare und Antworten von Freunden',friendList:'Freundesliste',friendDesc:'Hier werden Nutzer angezeigt, die sich gegenseitig folgen.',refreshFriends:'Freundesliste aktualisieren',chooseConversation:'Unterhaltung auswählen',messagePlaceholder:'Kommentar schreiben (max. 2.000 Zeichen)',send:'Senden',termsLink:'Nutzungsbedingungen',privacyLink:'Datenschutzerklärung'}
};
const sl=socialUI[lang]||socialUI.en;
const setText=(id,value)=>{const el=document.getElementById(id);if(el&&value)el.textContent=value};
setText('socialHeading',sl.heading);setText('socialDescription',sl.description);setText('aqwSocialStatus',sl.status);setText('aqwAuthHeading',sl.auth);
const authLabels=[['aqwUsernameField','username'],['aqwEmail','email'],['aqwPassword','password'],['aqwDisplayNameField','display']];
for(const [id,key] of authLabels){const el=document.getElementById(id);if(!el)continue;const span=el.querySelector('span')||(el.tagName==='INPUT'?el.parentElement?.querySelector('span'):null);if(span)span.textContent=sl[key];else if(el.parentElement?.tagName==='LABEL'){const node=[...el.parentElement.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(node)node.textContent=sl[key]+' '}}
const terms=document.querySelector('#aqwTermsField span');if(terms)terms.textContent=sl.terms;
setText('aqwSignIn',sl.signin);setText('aqwSignUp',sl.signup);setText('aqwSignOut',sl.signout);setText('aqwForgotPassword',({ja:'パスワードを忘れた場合',en:'Forgot password?',ko:'비밀번호를 잊으셨나요?',zh:'忘记密码？',es:'¿Olvidaste tu contraseña?',fr:'Mot de passe oublié ?',pt:'Esqueceu a senha?',de:'Passwort vergessen?'})[lang]||'Forgot password?');
const boxes=[...document.querySelectorAll('#social .social-columns > .social-box')];if(boxes[0]){const h=boxes[0].querySelector('h3');if(h)h.textContent=sl.profile;const b=boxes[0].querySelector('#aqwProfileForm button');if(b)b.textContent=sl.saveProfile;const hr=boxes[0].querySelector('hr');const h3=boxes[0].querySelectorAll('h3')[1];if(h3)h3.textContent=sl.changePassword;const p=boxes[0].querySelector('#aqwPasswordForm button');if(p)p.textContent=sl.changePassword;const labs=boxes[0].querySelectorAll('#aqwProfileForm > label, #aqwPasswordForm > label');const vals=lang==='ja'?['ユーザー名','表示名','自己紹介','新しいパスワード','新しいパスワード（確認）']:lang==='en'?['Username','Display name','Bio','New password','Confirm new password']:lang==='ko'?['사용자 이름','표시 이름','자기소개','새 비밀번호','새 비밀번호 확인']:lang==='zh'?['用户名','显示名称','个人简介','新密码','确认新密码']:lang==='es'?['Nombre de usuario','Nombre visible','Biografía','Nueva contraseña','Confirmar nueva contraseña']:lang==='fr'?['Nom d’utilisateur','Nom affiché','Bio','Nouveau mot de passe','Confirmer le nouveau mot de passe']:lang==='pt'?['Nome de usuário','Nome de exibição','Biografia','Nova senha','Confirmar nova senha']:['Benutzername','Anzeigename','Biografie','Neues Passwort','Neues Passwort bestätigen'];labs.forEach((lab,i)=>{const node=[...lab.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(node&&vals[i])node.textContent=vals[i]+' '})}
{
 const avatarText={
 ja:['プロフィールアイコン','JPEG・PNG・WebP・GIF、5MB以下','アイコンを削除'],
 en:['Profile picture','JPEG, PNG, WebP, or GIF · up to 5 MB','Remove picture'],
 ko:['프로필 사진','JPEG·PNG·WebP·GIF, 최대 5MB','프로필 사진 삭제'],
 zh:['个人头像','JPEG、PNG、WebP 或 GIF，最大 5MB','删除头像'],
 es:['Foto de perfil','JPEG, PNG, WebP o GIF · máximo 5 MB','Eliminar foto'],
 fr:['Photo de profil','JPEG, PNG, WebP ou GIF · 5 Mo maximum','Supprimer la photo'],
 pt:['Foto de perfil','JPEG, PNG, WebP ou GIF · até 5 MB','Remover foto'],
 de:['Profilbild','JPEG, PNG, WebP oder GIF · bis 5 MB','Bild entfernen']
 }[lang]||['Profile picture','JPEG, PNG, WebP, or GIF · up to 5 MB','Remove picture'];
 const avatarLabel=document.querySelector('.aqw-avatar-controls label');
 if(avatarLabel){const node=[...avatarLabel.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(node)node.textContent=avatarText[0]+' '}
 const avatarHelp=document.querySelector('.aqw-avatar-controls small');if(avatarHelp)avatarHelp.textContent=avatarText[1];
 setText('aqwRemoveAvatar',avatarText[2]);
}
if(boxes[1]){const h=boxes[1].querySelector('h3');if(h)h.textContent=sl.userSearch;const p=boxes[1].querySelector('p');if(p)p.textContent=sl.userSearchDesc;const inp=document.getElementById('aqwUserSearch');if(inp)inp.placeholder=sl.searchPlaceholder;const btn=boxes[1].querySelector('button[type="submit"]');if(btn)btn.textContent=sl.search}
const msgPanel=document.getElementById('aqwFriendMessagesPanel');if(msgPanel){const h=msgPanel.querySelector('h3');if(h)h.textContent=sl.friends;const hs=msgPanel.querySelectorAll('h4');if(hs[0])hs[0].textContent=sl.friendList;const p=msgPanel.querySelector('p.muted');if(p)p.textContent=sl.friendDesc;setText('aqwRefreshFriends',sl.refreshFriends);setText('aqwConversationTitle',sl.chooseConversation);const inp=document.getElementById('aqwMessageInput');if(inp)inp.placeholder=sl.messagePlaceholder;setText('aqwSendMessage',sl.send)}
const legal=document.querySelectorAll('#social > .legal-links a');if(legal[0])legal[0].textContent=sl.termsLink;if(legal[1])legal[1].textContent=sl.privacyLink;
const ph=document.getElementById('query');if(ph)ph.placeholder=lang==='ja'?'例：葬送のフリーレン':lang==='en'?'e.g. Frieren: Beyond Journey’s End':({ko:'예: 장송의 프리렌',zh:'例如：葬送的芙莉莲',es:'p. ej., Frieren',fr:'ex. : Frieren',pt:'ex.: Frieren',de:'z. B. Frieren'}[lang]||'Search anime');
}
const query=`query ($page:Int,$perPage:Int,$search:String,$id_in:[Int],$format_in:[MediaFormat],$startDate_greater:FuzzyDateInt,$startDate_lesser:FuzzyDateInt) { Page(page:$page,perPage:$perPage) { pageInfo { hasNextPage } media(id_in:$id_in,format_in:$format_in,startDate_greater:$startDate_greater,startDate_lesser:$startDate_lesser,type:ANIME,sort:POPULARITY_DESC,search:$search,isAdult:false) { id countryOfOrigin source(version:2) relations { edges { relationType node { id type countryOfOrigin format } } } format popularity title { romaji english native } description(asHtml:false) synonyms coverImage { large medium extraLarge } episodes seasonYear averageScore genres studios { nodes { name } } startDate { year }  externalLinks { url site type isDisabled language } } } }`;
function normalizeUnicode(value){if(typeof value==='string')return value.normalize('NFC');if(Array.isArray(value))return value.map(normalizeUnicode);if(value&&typeof value==='object'){const out={};for(const [key,item] of Object.entries(value))out[key]=normalizeUnicode(item);return out}return value}
function hasFamousJapaneseTitle(a){
 const names=[a?.title?.native,a?.title?.english,a?.title?.romaji,...(Array.isArray(a?.synonyms)?a.synonyms:[])];
 return names.some(name=>typeof name==='string'&&/[ぁ-んァ-ヶ]/.test(name));
}
function isJapaneseOriginAnime(a){
 if(!a)return false;
 if(a.countryOfOrigin!=='JP')return Number(a.popularity)>=10000&&hasFamousJapaneseTitle(a);
 const isJapaneseLanguage=value=>['ja','ja-jp','japanese','日本語'].includes(String(value||'').trim().toLowerCase());
 const languageValues=[a.originLanguage,a.originalLanguage,a.sourceLanguage,a.language].filter(value=>typeof value==='string'&&value.trim());
 if(languageValues.some(value=>!isJapaneseLanguage(value)))return false;
 if(a.originVerified===true)return true;
 if(a.source==='ORIGINAL')return true;
 const sourceRules={
  MANGA:{type:'MANGA',formats:['MANGA','ONE_SHOT']},
  LIGHT_NOVEL:{type:'MANGA',formats:['NOVEL']},
  NOVEL:{type:'MANGA',formats:['NOVEL']},
  DOUJINSHI:{type:'MANGA',formats:['MANGA','ONE_SHOT','NOVEL']},
  ANIME:{type:'ANIME',formats:['TV','TV_SHORT','MOVIE','OVA','ONA','SPECIAL']},
  WEB_NOVEL:{type:'MANGA',formats:['NOVEL']},
  VISUAL_NOVEL:{type:'MANGA',formats:['MANGA','ONE_SHOT','NOVEL']},
  VIDEO_GAME:{type:'MANGA',formats:['MANGA','ONE_SHOT','NOVEL']},
  OTHER:{type:'MANGA',formats:['MANGA','ONE_SHOT','NOVEL']}
 };
 const rule=sourceRules[a.source];
 const relationVerified=!!rule&&Array.isArray(a.relations?.edges)&&a.relations.edges.some(edge=>{
  const node=edge?.node;
  if(!['SOURCE','ADAPTATION'].includes(edge?.relationType)||!node||node.type!==rule.type||node.countryOfOrigin!=='JP'||!rule.formats.includes(node.format))return false;
  const sourceLanguage=[node.originLanguage,node.originalLanguage,node.sourceLanguage,node.language].filter(value=>typeof value==='string'&&value.trim());
  return !sourceLanguage.some(value=>!isJapaneseLanguage(value));
 });
 if(relationVerified)return true;
 return !!rule&&Number(a.popularity)>=10000&&hasFamousJapaneseTitle(a);
}
const $=s=>document.querySelector(s);let pool=[],questions=[],index=0,points=0,skippedQuestionCount=0,locked=false,questionTimer=null,clockTimer=null,secondsLeft=15,questionDeadline=0,startedAt=0,elapsedSeconds=0,missedQuestions=[],questionAttemptResults=[],reviewMode=false,playMode='normal',roundFailed=false,lastResultData=null,combo=0,bestCombo=0,choiceHintUsed=false,typedHintUsed=false,backgroundLoadPromise=null,sharedCatalogActive=false,requestedQuestionCount=10,rateLimitedUntil=0,failedImageUrls=new Set(),lateSharedCatalogItems=[],autoNextTimer=null,questionAdvanceToken=0,sharedSearchCatalogCache=null,sharedSearchIndexCache=new Map();
function titleImageIsSafe(anime){const image=anime?.coverImage?.large||anime?.coverImage?.medium||anime?.coverImage?.extraLarge||'';return hasUsableImageUrl(image)}
async function fetchSharedAnimeCatalog(){
 if(sharedSearchCatalogCache?.length)return sharedSearchCatalogCache;
 // Prefer the pre-compressed catalogue to reduce the initial network transfer.
 if(typeof DecompressionStream==='function'){
  try{
   const compressed=await fetch(new URL('data/anime-catalog.json.gz',document.baseURI),{cache:'no-cache',headers:{'Accept':'application/gzip'}});
   if(compressed.ok&&compressed.body){
    const stream=compressed.body.pipeThrough(new DecompressionStream('gzip'));
    const payload=await new Response(stream).json();
    if(payload?.schemaVersion===2&&Array.isArray(payload.items)){
     const items=payload.items.filter(isUsableAnime);
     if(items.length)sharedSearchCatalogCache=items;
     return items;
    }
   }
  }catch(error){console.warn('Compressed shared catalogue could not be loaded; trying JSON fallback:',error)}
 }
 try{
  // Keep the original JSON path as a compatibility fallback for older browsers.
  const response=await fetch(new URL('data/anime-catalog.json',document.baseURI),{cache:'no-cache',headers:{'Accept':'application/json'}});
  if(!response.ok)return [];
  const payload=await response.json();
  if(payload?.schemaVersion!==2||!Array.isArray(payload.items))return [];
  const items=payload.items.filter(isUsableAnime);
  if(items.length)sharedSearchCatalogCache=items;
  return items;
 }catch(error){console.warn('Shared anime catalogue could not be loaded:',error);return []}
}
async function fetchAnime(vars={}){
 const request=async(variables,sort='POPULARITY_DESC')=>{
  let lastError;
  for(let attempt=0;attempt<5;attempt++){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
   try{
    const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:query.replace('sort:POPULARITY_DESC','sort:'+sort),variables}),signal:controller.signal});
    if(!response.ok){
     const err=new Error(response.status===429?'アクセスが集中しています（HTTP 429）。':('データサーバー応答エラー（HTTP '+response.status+'）。'));
     err.status=response.status;
     if(response.status===429){const retrySeconds=Number(response.headers.get('Retry-After'))||30;rateLimitedUntil=Math.max(rateLimitedUntil,Date.now()+retrySeconds*1000);lastError=err;await new Promise(resolve=>setTimeout(resolve,Math.max(5000*(attempt+1),rateLimitedUntil-Date.now())));continue}
     if(response.status>=500){lastError=err;await new Promise(resolve=>setTimeout(resolve,1500*Math.pow(2,attempt)));continue}
     throw err;
    }
    const json=await response.json();
    if(json.errors?.length){const error=new Error(json.errors.map(e=>e.message).join(' / '));error.graphqlErrors=true;throw error}
    const pageData=json.data?.Page;const items=normalizeUnicode(pageData?.media||[]).filter(isJapaneseOriginAnime);items.hasNextPage=pageData?.pageInfo?.hasNextPage===true;return items;
   }catch(error){
    lastError=error.name==='AbortError'?new Error('データ取得がタイムアウトしました。'):error;
    if(error.graphqlErrors||(error.status&&error.status<500&&error.status!==429))break;
    if(attempt<4)await new Promise(resolve=>setTimeout(resolve,700*Math.pow(2,attempt)));
   }finally{clearTimeout(timeout)}
  }
  throw lastError||new Error('データを取得できませんでした。');
 };
 const requestPageBatch=async(pages,sort,format,yearStart,yearEnd)=>{
  const fields='id countryOfOrigin source(version:2) relations { edges { relationType node { id type countryOfOrigin format } } } format popularity title { romaji english native } description(asHtml:false) synonyms coverImage { large medium extraLarge } episodes seasonYear averageScore genres studios(isMain:true) { nodes { name } }  externalLinks { url site type isDisabled language }';
  const formatArg=(format?',format_in:['+format+']':'')+(yearStart?',startDate_greater:'+(yearStart*10000)+',startDate_lesser:'+((yearEnd+1)*10000):'');
  const aliases=pages.map((page,index)=>'p'+index+': Page(page:'+page+',perPage:50) { pageInfo { hasNextPage } media(type:ANIME,sort:'+sort+',isAdult:false'+formatArg+') { '+fields+' } }').join(' ');
  const batchQuery='query { '+aliases+' }';
  let lastError;
  for(let attempt=0;attempt<4;attempt++){
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:batchQuery}),signal:controller.signal});
    if(!response.ok){
     const err=new Error(response.status===429?'アクセスが集中しています（HTTP 429）。':('データサーバー応答エラー（HTTP '+response.status+'）。'));
     if(response.status===429){const retrySeconds=Number(response.headers.get('Retry-After'))||30;rateLimitedUntil=Math.max(rateLimitedUntil,Date.now()+retrySeconds*1000);lastError=err;await new Promise(resolve=>setTimeout(resolve,Math.max(5000*(attempt+1),rateLimitedUntil-Date.now())));continue}
     if(response.status>=500){lastError=err;await new Promise(resolve=>setTimeout(resolve,1500*Math.pow(2,attempt)));continue}
     throw err;
    }
    const json=await response.json();
    if(json.errors?.length){const error=new Error(json.errors.map(e=>e.message).join(' / '));error.batchUnsupported=true;throw error}
    return pages.map((_,index)=>({items:normalizeUnicode(json.data?.['p'+index]?.media||[]).filter(isJapaneseOriginAnime),hasNextPage:json.data?.['p'+index]?.pageInfo?.hasNextPage===true}));
   }catch(error){
    if(error.name==='AbortError'){lastError=new Error('データ取得がタイムアウトしました。');lastError.batchUnsupported=error.batchUnsupported===true}else{lastError=error}
    if(error.batchUnsupported)break;
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,800*Math.pow(2,attempt)));
   }finally{clearTimeout(timeout)}
  }
  if(lastError?.batchUnsupported)return Promise.all(pages.map(async page=>{const items=await request({page,perPage:50,format_in:format?[format]:undefined,startDate_greater:yearStart?yearStart*10000+101:undefined,startDate_lesser:yearEnd?yearEnd*10000+1231:undefined},sort);return {items,hasNextPage:items.hasNextPage===true}}));
  throw lastError||new Error('データをまとめて取得できませんでした。');
 };
 if(vars.search){
  const searchKey=normalizeAnswer(vars.search);
  let localMatches=[];
  try{
   const sharedItems=await fetchSharedAnimeCatalog();
   const localSource=mergeAnimeCollection([...sharedItems,...pool]);
   if(searchKey&&localSource.length){
    for(const anime of localSource){
     const id=Number(anime.id);
     if(!Number.isFinite(id)||sharedSearchIndexCache.has(id))continue;
     const keys=[...new Set(titleAnswerVariants(anime).map(normalizeAnswer).filter(Boolean))];
     sharedSearchIndexCache.set(id,{anime,keys});
    }
    localMatches=[...sharedSearchIndexCache.values()]
     .filter(record=>record.keys.some(key=>key.includes(searchKey)))
     .map(record=>record.anime);
   }
  }catch(error){console.warn('Local anime catalogue search was unavailable:',error)}
  let remoteItems=[];
  try{
   const pages=await Promise.all([1,2].map(page=>request({page,perPage:25,search:vars.search})));
   remoteItems=pages.flat();
  }catch(error){
   if(!localMatches.length)throw error;
   console.warn('AniList search fallback failed; using matching shared-catalogue records:',error);
  }
  const raw=mergeAnimeCollection([...localMatches,...remoteItems]).filter(isUsableAnime);
  const unique=deduplicateSearchResults(raw),duplicateCount=Math.max(0,raw.length-unique.length),limited=unique.slice(0,30);
  limited.duplicateCount=duplicateCount;
  return limited;
 }
 const cacheKey='aqw-anime-pool-v22-compact-shared-catalog';
 // Merge every older local catalogue cache; the application no longer imposes an item-count target.
 let initial=[],cacheSavedAt=0,savedProgress=null;
 try{
  const stored=await new Promise(resolve=>{
   try{
    const req=indexedDB.open('aqw-catalogue',1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('catalogues'))req.result.createObjectStore('catalogues')};
    req.onsuccess=()=>{
     const db=req.result;
     try{
      const tx=db.transaction('catalogues','readwrite'),store=tx.objectStore('catalogues');
      const keysReq=store.getAllKeys();
      keysReq.onsuccess=()=>{
       const keys=keysReq.result||[];
       const catalogueKeys=keys.filter(key=>typeof key==='string'&&/^aqw-anime-pool-v\d+$/.test(key));
       // Read only the current cache, or the newest legacy cache as a one-time fallback.
       // Merging every historical snapshot repeatedly makes startup slower as the cache grows.
       const newestLegacy=catalogueKeys.sort((a,b)=>Number((b.match(/v(\d+)$/)||[])[1]||0)-Number((a.match(/v(\d+)$/)||[])[1]||0))[0];
       const readKey=keys.includes(cacheKey)?cacheKey:newestLegacy;
       const results=[];
       let pending=2,progress=null;
       const finish=()=>{if(--pending===0)resolve({cachedItems:results.flatMap(x=>Array.isArray(x?.items)?x.items:[]),progress})};
       if(readKey){const get=store.get(readKey);get.onsuccess=()=>{if(get.result){const value=get.result;if(Array.isArray(value.items)){const cleanedItems=value.items.filter(isUsableAnime);if(cleanedItems.length!==value.items.length)store.put({...value,items:cleanedItems},readKey);results.push({...value,items:cleanedItems})}else results.push(value)}finish()};get.onerror=finish}else finish();
       const progressGet=store.get(cacheKey+'-progress');
       progressGet.onsuccess=()=>{progress=progressGet.result||null;finish()};
       progressGet.onerror=finish;
      };
      keysReq.onerror=()=>resolve({cachedItems:[],progress:null});
     }catch(e){resolve({cachedItems:[],progress:null})}
    };
    req.onerror=()=>resolve({cachedItems:[],progress:null});
   }catch(e){resolve({cachedItems:[],progress:null})}
  });
  savedProgress=stored?.progress||null;
  if(Array.isArray(stored?.cachedItems)&&stored.cachedItems.length){
   initial=mergeAnimeCollection(stored.cachedItems.filter(isUsableAnime));
   cacheSavedAt=Date.now();
  }
  try{
   // Fall back to one newest legacy localStorage snapshot only when IndexedDB has no catalogue.
   if(!initial.length){
    const legacyKeys=safeStorage.keys().filter(key=>/^aqw-anime-pool-v\d+$/.test(key));
    legacyKeys.sort((a,b)=>Number((b.match(/v(\d+)$/)||[])[1]||0)-Number((a.match(/v(\d+)$/)||[])[1]||0));
    const legacy=legacyKeys.length?JSON.parse(safeStorage.getItem(legacyKeys[0])||'null'):null;
    if(Array.isArray(legacy?.items))initial=legacy.items.filter(isUsableAnime);
    if(Number(legacy?.savedAt)>cacheSavedAt)cacheSavedAt=Number(legacy.savedAt);
   }
   initial=mergeAnimeCollection(initial);
  }catch(e){}

 }catch(e){}
 // Merge the shared GitHub Pages catalogue before continuing, with a short wait for returning visitors.
 let sharedCatalogItems=[];
 const sharedCatalogPromise=fetchSharedAnimeCatalog();
 let sharedResult={timedOut:false,items:[]},sharedTimer;
 try{
  sharedResult=await Promise.race([
   sharedCatalogPromise.then(items=>({timedOut:false,items})),
   new Promise(resolve=>{sharedTimer=setTimeout(()=>resolve({timedOut:true,items:[]}),initial.length?900:2200)})
  ]);
 }catch(e){}finally{clearTimeout(sharedTimer)}
 sharedCatalogItems=sharedResult.items||[];
 if(sharedCatalogItems.length)initial=mergeAnimeCollection([...initial,...sharedCatalogItems]);
 if(sharedResult.timedOut){
  // Do not make the start button wait for a large shared JSON download.
  // The first usable AniList/cache batch can start the quiz; the shared catalogue
  // is merged in when its download eventually completes.
  sharedCatalogPromise.then(items=>{
   if(!items.length)return;
   if(pool.length){
    pool=deduplicateQuestionPool(mergeAnimeCollection([...pool,...items]));
    if(quizFinished)prewarmQuestionSummaryForRestart();
    sharedCatalogActive=true;
    // Rebuild candidate indexes during idle time after a late catalogue merge,
    // rather than forcing the next Start click to pay the full index cost.
    scheduleEligibleCandidatePrewarm();
    extendQuestionsFromPool(items).catch(error=>console.warn('Late question extension deferred:',error));
   }else lateSharedCatalogItems=items;
  }).catch(error=>console.warn('Late shared catalogue load failed:',error));
 }
 initial=deduplicateQuestionPool(initial);
 sharedCatalogActive=sharedCatalogItems.length>0;
 if(sharedCatalogActive){
  // Use the shared catalogue as an immediate starting set, then keep expanding it from AniList.
  pool=initial;
  const progress=document.getElementById('animePoolProgress');
  if(progress)progress.textContent=lang==='ja'?('共通カタログ：'+initial.length.toLocaleString()+'作品。追加取得を開始します。'):('Shared catalogue: '+initial.length.toLocaleString()+' anime. Fetching additional records.');
  const status=document.getElementById('quizStatus');
  if(status)status.textContent=lang==='ja'?'共通作品データを読み込みました。追加の作品データを取得しています。':'Shared anime catalogue loaded. Fetching additional anime in the background.';
 }
 
 if(!initial.length){
  const first=(await request({page:1,perPage:50},'POPULARITY_DESC')).filter(isUsableAnime);
  if(!first.length)throw new Error(lang==='ja'?'作品データを取得できませんでした。通信制限または接続障害の可能性があります。':'Could not load anime data. The connection may be blocked or temporarily unavailable.');
  initial=first;
  try{safeStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),items:initial}))}catch(e){}
 }
 // Return usable cached data immediately. Fill the pool in the background at a rate compatible with AniList limits.
 if(!backgroundLoadPromise&&!sharedCatalogActive){
  backgroundLoadPromise=(async()=>{
   const all=new Map(initial.map(a=>[a.id,a]));
   // Limited on-demand fallback only: the shared snapshot is preferred, and AniList is never crawled page-by-page.
   const makeTasks=()=>{
    const list=[];
    const missingPopularity=[...all.values()].slice(0,150).filter(a=>!Number.isFinite(Number(a.popularity))||Number(a.popularity)<=0).map(a=>Number(a.id)).filter(Number.isFinite);
    for(let i=0;i<missingPopularity.length;i+=50)list.push(['ID_IN',missingPopularity.slice(i,i+50),'enrich']);
    // Page 1 was fetched above. Fetch only pages 2-3 (100 more results) if the shared catalogue is unavailable.
    for(let page=2;page<=3;page++)list.push(['POPULARITY_DESC',page,'fill']);
    return list;
   };
   const tasks=makeTasks();
   let taskIndex=0;
   let completed=0,failures=0,batchesSinceSave=0,sessionBatches=0;
   const saveProgress=async(items,nextIndex)=>{
    try{await new Promise(resolve=>{const req=indexedDB.open('aqw-catalogue',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('catalogues'))req.result.createObjectStore('catalogues')};req.onsuccess=()=>{try{const tx=req.result.transaction('catalogues','readwrite'),store=tx.objectStore('catalogues');store.put({savedAt:Date.now(),items},cacheKey);store.delete(cacheKey+'-progress');tx.oncomplete=()=>resolve();tx.onerror=()=>resolve()}catch(e){resolve()}};req.onerror=()=>resolve()})}catch(e){}
   };
   for(;taskIndex<tasks.length;){
    // A late shared-catalogue response supersedes this limited AniList fallback query.
    if(sharedCatalogActive)break;
    const [sort,page,taskType,format,yearStart,yearEnd]=tasks[taskIndex];
    
    // Bundle up to three adjacent pages into one GraphQL request. This cuts round trips while keeping each response to at most 150 anime records.
    const batch=[tasks[taskIndex]];
    if(taskType==='fill'){
     for(let offset=1;offset<3&&taskIndex+offset<tasks.length;offset++){
      const next=tasks[taskIndex+offset],previous=batch[batch.length-1];
      if(next[2]==='fill'&&next[0]===sort&&next[1]===page+offset&&next[3]===format&&next[4]===yearStart&&next[5]===yearEnd&&next[6]===previous[6])batch.push(next);
      else break;
     }
    }
    await new Promise(resolve=>setTimeout(resolve,2100));
    let pageResults=[];
    try{
     pageResults=sort==='ID_IN'?[{items:await request({id_in:page,perPage:50}),hasNextPage:false}]:await requestPageBatch(batch.map(task=>task[1]),sort,format,yearStart,yearEnd);
     pageResults.forEach(result=>(result.items||[]).forEach(a=>{if(isUsableAnime(a)){const previous=all.get(a.id);all.set(a.id,previous?mergeAnimeRecords(previous,a):a)}}));
    }catch(err){failures+=batch.length;console.warn('Background anime page batch failed:',sort,page,err);const retryable=batch.filter(task=>Number(task[6]||0)<2);if(retryable.length)tasks.push(...retryable.map(task=>[...task,Number(task[6]||0)+1]))}
    if(format&&!yearStart&&batch.some(task=>task[1]===100)&&pageResults.some(result=>result.hasNextPage===true)){
     // A format scope exceeding AniList's 5,000-item page window may hide records outside its first sort slice.
     // Add complementary sort scopes only for overflowing formats, avoiding extra requests for small formats.
     for(const overflowSort of overflowSorts){
      const overflowScope=overflowSort+'|'+format;
      if(existingOverflowScopes.has(overflowScope))continue;
      existingOverflowScopes.add(overflowScope);
      for(let overflowPage=1;overflowPage<=200;overflowPage++)tasks.push([overflowSort,overflowPage,'fill',format]);
     }
     for(let startYear=1900;startYear<=2030;startYear+=10){
      const endYear=startYear+9,scope=sort+'|'+format+'|'+startYear+'|'+endYear;
      if(existingDateScopes.has(scope))continue;
      existingDateScopes.add(scope);
      for(let datePage=1;datePage<=200;datePage++)tasks.push([sort,datePage,'fill',format,startYear,endYear]);
     }
    }
    let nextTaskIndex=taskIndex+batch.length;
    if(pageResults.some(result=>result.hasNextPage===false))while(nextTaskIndex<tasks.length&&tasks[nextTaskIndex][0]===sort&&tasks[nextTaskIndex][3]===format&&tasks[nextTaskIndex][4]===yearStart&&tasks[nextTaskIndex][5]===yearEnd&&tasks[nextTaskIndex][2]==='fill')nextTaskIndex++;
    taskIndex=nextTaskIndex;
    completed=taskIndex;
    batchesSinceSave++;
    sessionBatches++;
    if(sessionBatches>=6){
     const items=[...all.values()];
     pool=items;
     if(quizFinished)prewarmQuestionSummaryForRestart();
     scheduleEligibleCandidatePrewarm();
     extendQuestionsFromPool(pageResults.flatMap(result=>result.items||[]));
     await saveProgress(items,taskIndex);
     batchesSinceSave=0;
     sessionBatches=0;
     const pauseStatus=document.getElementById('quizStatus');
     if(pauseStatus)pauseStatus.textContent=lang==='ja'?'負荷を抑えるため、作品データの追加取得を1分間休止します。':'Background catalogue loading is taking a one-minute cooldown to reduce load.';
     await new Promise(resolve=>setTimeout(resolve,60000));
    }
    if(batchesSinceSave>=12||taskIndex>=tasks.length){
     // IDs are already unique in the Map. Avoid sorting and re-filtering the entire catalogue every few pages.
     const items=[...all.values()];
     pool=items;if(quizFinished)prewarmQuestionSummaryForRestart();scheduleEligibleCandidatePrewarm();extendQuestionsFromPool(pageResults.flatMap(result=>result.items||[]));
     // Persist in small intervals to avoid repeatedly serializing the entire growing catalogue.
     await saveProgress(items,taskIndex);
     batchesSinceSave=0;
    }
    const status=document.getElementById('quizStatus');
    if(status){
     const progress=document.getElementById('animePoolProgress');
     if(progress)progress.textContent=lang==='ja'?('取得中：'+all.size.toLocaleString()+'作品・処理ページ '+completed+' / '+tasks.length+'・失敗試行 '+failures+'件'):('Loading: '+all.size.toLocaleString()+' anime · processed pages '+completed+' / '+tasks.length+' · failed attempts '+failures);
     status.textContent=lang==='ja'?'作品データを追加中… '+all.size.toLocaleString()+'作品':'Adding anime… '+all.size.toLocaleString()+' anime';
    }
   }
   const finished=taskIndex>=tasks.length;
   const progress=document.getElementById('animePoolProgress');
   if(progress)progress.textContent=finished?(lang==='ja'?('最終取得数：'+all.size.toLocaleString()+'作品・処理ページ '+completed+' / '+tasks.length+'・失敗試行 '+failures+'件。データはこのブラウザに保存されます。'):('Final catalogue: '+all.size.toLocaleString()+' anime · processed pages '+completed+' / '+tasks.length+' · failed attempts '+failures+'. Saved in this browser.')):(lang==='ja'?('取得ページ '+completed+' / '+tasks.length+'。負荷を抑えるため今回は一時停止し、次回アクセス時に続行します。'):('Processed '+completed+' / '+tasks.length+' pages. Paused to reduce load; work resumes on a later visit.'));
   const status=document.getElementById('quizStatus');
   if(status)status.textContent=finished?(lang==='ja'?('取得処理が完了しました。現在'+all.size.toLocaleString()+'作品を利用できます。取得済みデータはこのブラウザに保存されています。'):('Catalogue loading has finished. '+all.size.toLocaleString()+' anime are available and saved in this browser.')):(lang==='ja'?'作品データの追加取得を一時停止しました。クイズはそのまま利用できます。':'Background catalogue loading is paused. The quiz remains available.');
   await saveProgress([...all.values()],taskIndex);
   return {count:all.size,failures,completed,finished};
  })().finally(()=>{backgroundLoadPromise=null});
 }
 return initial;
}
function hasUsableImageUrl(value){const url=String(value||'').trim();return /^https?:\/\//i.test(url)&&!/(?:no[-_ ]?image|placeholder|default[-_ ]?image|(?:^|\/)default(?:\.[a-z0-9]+)?(?:[?#]|$))/i.test(url)&&!failedImageUrls.has(url)}
function isUsableAnime(a){const titleImage=a?.coverImage?.large||a?.coverImage?.medium||a?.coverImage?.extraLarge||'';return !!(a&&a.id&&a.isAdult!==true&&isJapaneseOriginAnime(a)&&hasUsableImageUrl(titleImage)&&titleOf(a)&&['TV','TV_SHORT','MOVIE','OVA','ONA','SPECIAL'].includes(a.format)&&!((a.genres||[]).includes('Hentai')))}
function deduplicateSearchResults(items){
 // Prefer the most popular record. Deduplicate identical title/year/format records,
 // but do not discard a sequel merely because it shares a franchise alias.
 const sorted=[...(items||[])].filter(isUsableAnime).sort((a,b)=>(Number(b.popularity)||0)-(Number(a.popularity)||0)||(Number(b.averageScore)||0)-(Number(a.averageScore)||0)||Number(a.id)-Number(b.id));
 const seenIds=new Set(),seenIdentities=new Set(),result=[];
 for(const anime of sorted){
  const id=Number(anime.id);
  if(!Number.isFinite(id)||seenIds.has(id))continue;
  const primaryTitle=normalizeAnswer(titleOf(anime));
  if(!primaryTitle)continue;
  const year=Number(anime.seasonYear)||Number(anime.startDate?.year)||0;
  const format=String(anime.format||'').toUpperCase();
  const specificTitle=[anime.title?.native,anime.title?.english,anime.title?.romaji]
   .find(value=>typeof value==='string'&&/(?:第\s*\d+\s*(?:期|シーズン)|season\s*\d+|\d+(?:st|nd|rd|th)?\s*season|final\s+season|part\s*\d+|第\s*\d+\s*部)/i.test(String(value).normalize('NFKC')));
  const seasonLabel=specificTitle?normalizeAnswer(specificTitle):'';
  const identity=[primaryTitle,year,format,seasonLabel].join('|');
  if(seenIdentities.has(identity))continue;
  seenIds.add(id);seenIdentities.add(identity);result.push(anime);
 }
 return result;
}
function mergeAnimeRecords(existing,incoming){
 const stripUnusedCharacters=anime=>{
  if(!anime||typeof anime!=='object'||Array.isArray(anime))return anime;
  const clean={...anime};
  delete clean.characters;
  return clean;
 };
 existing=stripUnusedCharacters(existing);
 incoming=stripUnusedCharacters(incoming);
 if(!existing)return incoming;
 if(!incoming)return existing;
 const merge=(oldValue,newValue)=>{
  if(newValue===null||newValue===undefined||newValue==='')return oldValue;
  if(Array.isArray(newValue))return newValue.length?newValue:oldValue;
  if(newValue&&typeof newValue==='object'&&!Array.isArray(newValue)){
   const result={...(oldValue&&typeof oldValue==='object'&&!Array.isArray(oldValue)?oldValue:{})};
   for(const [key,value] of Object.entries(newValue))result[key]=merge(result[key],value);
   return result;
  }
  return newValue;
 };
 return merge(existing,incoming);
}
function mergeAnimeCollection(items){
 const byId=new Map();
 for(const anime of items||[]){
  const id=Number(anime?.id);
  if(!Number.isFinite(id))continue;
  byId.set(id,mergeAnimeRecords(byId.get(id),anime));
 }
 return [...byId.values()];
}
function deduplicateQuestionPool(items){
 // Keep every distinct AniList entry. Seasons, sequels, movies, OVAs and remakes
 // are separate quiz subjects; only repeated copies of the same AniList ID are removed.
 const sorted=[...(items||[])].filter(isUsableAnime).sort((a,b)=>(Number(b.popularity)||0)-(Number(a.popularity)||0)||(Number(b.averageScore)||0)-(Number(a.averageScore)||0)||Number(a.id)-Number(b.id));
 const seenIds=new Set(),result=[];
 for(const anime of sorted){
  const id=Number(anime.id);
  if(!Number.isFinite(id)||seenIds.has(id))continue;
  seenIds.add(id);result.push(anime);
 }
 return result;
}
function animeYear(a){return Number.isInteger(a?.seasonYear)?a.seasonYear:(Number.isInteger(a?.startDate?.year)?a.startDate.year:null)}
const JAPANESE_SYNOPSIS_OVERRIDES=new Map(Object.entries({
 '青春ブタ野郎はバニーガール先輩の夢を見ない':'思春期特有の不思議な現象「思春期症候群」が起こる町。高校生の梓川咲太は、周囲から見えなくなった先輩・桜島麻衣と出会い、彼女に起きた異変の謎を追い始める。',
 'STEINS;GATE':'秋葉原で小さな発明を続ける大学生たちは、偶然にも過去へメッセージを送る方法を見つける。仲間を守ろうとする選択が、やがて世界の運命を左右する。',
 '無職転生 ～異世界行ったら本気だす～':'人生をやり直す機会を得て異世界に生まれ変わった青年ルーデウス。前世の後悔を胸に、魔法や人との出会いを通じて少しずつ成長していく。',
 'Re:ゼロから始める異世界生活':'異世界に突然召喚されたナツキ・スバルは、死をきっかけに時間が巻き戻る力に気づく。大切な人たちを救うため、何度も困難な運命に立ち向かう。',
 'この素晴らしい世界に祝福を！':'異世界で新たな生活を始めたカズマは、女神や魔法使い、騎士とパーティーを組む。しかし、集まった仲間はそれぞれ大きな欠点を抱えていた。',
 'ノーゲーム・ノーライフ':'あらゆる勝負をゲームで決める世界に招かれた天才ゲーマー兄妹。人間が最弱とされる世界で、知恵と連携を武器に種族間の勝負へ挑む。',
 'ソードアート・オンライン':'仮想世界のオンラインゲームに閉じ込められたプレイヤーたち。現実へ戻る条件を満たすため、キリトは仲間とともに危険な攻略へ挑む。',
 'あの日見た花の名前を僕達はまだ知らない。':'幼なじみを失って以来、仲間との関係が途切れてしまった少年・仁太。ある夏、亡くなったはずの少女が目の前に現れ、止まっていた時間が動き始める。',
 'Angel Beats!':'死後の世界にある学園で目覚めた少年は、謎の少女と反抗組織の活動に巻き込まれる。生徒たちはそれぞれの過去と向き合いながら、この世界の秘密を探る。',
 '葬送のフリーレン':'魔王を倒した勇者一行の魔法使いフリーレンは、長い寿命を持つエルフ。仲間との別れを経て、人間を知るための新たな旅に出る。',
 '鬼滅の刃':'鬼に家族を奪われ、妹まで鬼に変えられた少年・炭治郎。妹を人間に戻す方法を探しながら、鬼と戦う剣士として過酷な道を進む。',
 '呪術廻戦':'人間の負の感情から生まれる呪いが存在する世界。高校生の虎杖悠仁は強力な呪物を取り込んだことをきっかけに、呪術師たちの戦いへ身を投じる。',
 '【推しの子】':'産婦人科医の青年は、ある出来事を境に芸能界と深く関わることになる。華やかな舞台の裏にある秘密や思惑を追いながら、物語は予想外の方向へ進んでいく。',
 'かぐや様は告らせたい～天才たちの恋愛頭脳戦～':'名門校の生徒会で活動する白銀御行とかぐやは、互いに惹かれながらも自分から告白することを避けている。相手に告白させようと、日々駆け引きを繰り広げる。',
 'SPY×FAMILY':'任務のため仮初めの家族を作ることになった凄腕スパイ。秘密を抱えた妻と娘との暮らしは、互いの正体を知らないまま思いがけない騒動を生み出す。',
 '進撃の巨人':'人類が巨大な壁の内側で暮らす世界。壁を破る巨人の襲来によって日常を失ったエレンは、仲間とともに巨人の謎と世界の真実へ迫っていく。',
 'ハイキュー!!':'小柄ながら高い跳躍力を持つ日向翔陽は、高校バレー部でかつての因縁を持つ影山と再会する。異なる強みを持つ二人は、全国大会を目指して成長していく。',
 '僕のヒーローアカデミア':'多くの人が個性と呼ばれる能力を持つ社会で、無個性の少年・緑谷出久はヒーローを夢見ている。憧れの人物との出会いを機に、夢への道が開かれる。',
 '名探偵コナン':'高校生探偵の工藤新一は、謎の組織によって幼い姿に変えられてしまう。正体を隠して江戸川コナンと名乗り、難事件を解きながら元の姿に戻る方法を探す。',
 'ONE PIECE':'海賊王を目指すモンキー・D・ルフィは、仲間を集めながら大海原へ旅立つ。個性豊かな仲間たちと数々の島を巡り、伝説の秘宝を追い求める。',
 '薬屋のひとりごと':'後宮に仕えることになった薬師の少女・猫猫は、薬や毒に関する知識を生かして宮中の不可解な事件を解き明かしていく。',
 'ぼっち・ざ・ろっく！':'人前で話すことが苦手なギター好きの少女・ひとりは、ひょんなことからバンドに加入する。仲間との演奏を通じて、少しずつ自分の世界を広げていく。',
 '東京リベンジャーズ':'人生に行き詰まった青年・花垣武道は、過去へ戻る不思議な力を得る。大切な人を救うため、かつての仲間たちと関わりながら未来を変えようとする。',
 '東京リベンジャーズ 聖夜決戦編':'過去を変えたはずなのに、現代で再び大切な人の危機を知った武道。彼は東京卍會の仲間たちと向き合い、クリスマスの夜に起こる黒龍との抗争へ巻き込まれていく。',
 'コードギアス 反逆のルルーシュ':'巨大な帝国に支配された日本で、特殊な力を手にした少年ルルーシュは仮面の反逆者となる。妹との約束を胸に、世界を変えるための戦いを始める。',
 '魔法少女まどか☆マギカ':'不思議な存在から魔法少女になる契約を持ちかけられた中学生のまどか。願いをかなえる力の裏側にある、魔法少女の過酷な現実が少しずつ明らかになる。',
 'サマータイムレンダ':'故郷の島へ戻った青年・慎平は、幼なじみの死をきっかけに島で起きている異変を知る。繰り返される時間の中で、島に潜む謎へ迫っていく。',
 '四月は君の嘘':'母の死をきっかけにピアノが弾けなくなった少年・有馬公生。自由奔放なバイオリニストとの出会いが、止まっていた彼の音楽と日常を変えていく。',
 '鋼の錬金術師 FULLMETAL ALCHEMIST':'禁忌を犯して大切なものを失ったエルリック兄弟は、元の身体を取り戻す手がかりを求めて旅に出る。錬金術の力と国家の秘密が交差する物語。',
 'Dr.STONE':'謎の現象によって人類が石になった世界。数千年後に目覚めた科学好きの千空は、科学の知識を使って文明を一から取り戻そうとする。',
 'ヱヴァンゲリヲン新劇場版:序':'大災害セカンド・インパクトから14年後、謎の生命体「使徒」が襲来する世界。父に呼び出された14歳の碇シンジは、特務機関ネルフで巨大な人型兵器エヴァンゲリオン初号機に乗り、使徒と戦うことになる。',
 'ブラッドラッド':'魔界の一角を治める吸血鬼スタズは、日本の文化を愛している。ある日、人間の少女・柳冬実が彼の縄張りに迷い込む。冬実が幽霊になったことをきっかけに、スタズは彼女を生き返らせる方法を探し始める.',
 'モブサイコ100':'強大な超能力を持ちながら目立つことを望まない少年・モブ。師匠や仲間との日々を通じて、力だけでは解決できない人間関係や自分自身の感情と向き合う。',
 'ワンパンマン':'どんな敵も一撃で倒してしまう力を手に入れたヒーロー、サイタマ。強敵を求めながら、個性豊かなヒーローたちが集う世界で活動を続ける。',
 'CLANNAD':'学校生活にどこか距離を感じている高校生・岡崎朋也は、坂道で古河渚と出会う。渚や周囲の人々との交流を通じて、朋也の日常は少しずつ変わっていく。',
 'とある魔術の禁書目録':'超能力開発が進む学園都市に暮らす高校生・上条当麻。あらゆる異能を打ち消す右手を持つ彼の前に、魔術書を記憶した少女インデックスが現れ、科学と魔術が交差する事件に巻き込まれていく。',
 'Fate/Zero':'あらゆる願いをかなえる聖杯を巡り、七人の魔術師が英霊を召喚して戦う第四次聖杯戦争。衛宮切嗣や言峰綺礼ら、それぞれ異なる願いを抱く者たちの思惑が冬木の街で交錯する。',
 'HUNTER×HUNTER':'父と同じハンターになることを目指す少年ゴンは、父を探す旅に出て過酷なハンター試験へ挑む。試験の中でクラピカ、レオリオ、キルアと出会い、仲間やライバルとともに未知の世界へ踏み出していく。',
 'DEATH NOTE':'死神が落とした、名前を書かれた人間に死をもたらすノートを拾った高校生・夜神月。理想の世界を作ろうと行動する月の前に、正体不明の名探偵Lが立ちはだかり、二人の頭脳戦が始まる。',
 '聲の形':'小学生の頃、転校生の西宮硝子と出会った石田将也は、ある出来事をきっかけに周囲から孤立する。高校生になった将也は、過去と向き合うため硝子を訪ね、もう一度人とつながろうとする。',
 'ヴァイオレット・エヴァーガーデン':'戦争で大切な人を失い、その人が残した言葉の意味を探すヴァイオレット。手紙を代筆する仕事を通じて、さまざまな人の想いに触れながら、自分の感情を少しずつ知っていく。',
 'HUNTER×HUNTER (2011)':'父と同じハンターになることを目指す少年ゴンは、父を探す旅に出て過酷な試験に挑む。試験で出会った仲間とともに、未知の世界で数々の試練を乗り越えていく。',
 '東京喰種トーキョーグール':'人間と、人を喰らう存在「喰種」が共存する東京。大学生の金木研はある事件を境に人間と喰種の狭間に立たされ、二つの世界の間で自分の生き方を探す。',
 '君の名は。':'東京で暮らす瀧と山あいの町に住む三葉は、ある日から夢の中で互いの生活を経験するようになる。入れ替わりの理由を探るうち、二人は時を越えた不思議な縁に気づいていく。',
 'NARUTO -ナルト-':'里の人々から距離を置かれて育った少年ナルトは、忍者学校を卒業し、仲間と任務に挑む。火影を目指す彼は、師や仲間との出会いを通じて忍として成長していく。',
 '進撃の巨人 Season２':'壁の外に潜む巨人の謎を追うエレンたち。新たな脅威と仲間たちの秘密が明らかになるなか、調査兵団は人類を守るため、壁に隠された真実へ迫っていく。',
 '進撃の巨人 Season３':'壁の内側に隠された歴史と王政の秘密を知ったエレンたち。調査兵団は人類の過去を明らかにするため、政治的な争いと巨人の脅威の双方に立ち向かう。',
 '僕だけがいない街':'漫画家を目指す青年・藤沼悟は、身近な危機の前に時間が巻き戻る現象を経験する。ある事件をきっかけに小学生時代へ戻った悟は、過去に起きた悲劇を防ごうとする。',
 '文豪ストレイドッグス':'孤児院を追われた中島敦は、異能力を持つ人々が集う武装探偵社と出会う。仲間たちと事件に向き合うなか、異能力者同士の組織抗争へ巻き込まれていく。',
 'オーバーロード':'サービス終了を迎えたオンラインゲームの世界に、主人公は骸骨の姿のまま取り残される。配下のNPCたちと行動を始めた彼は、未知の世界で自らの居場所を探る。',
 'ブラッククローバー':'魔法が当たり前の世界で、魔力を持たずに生まれた少年アスタは魔法帝を目指す。反魔法の力を得た彼は、仲間とともに魔法騎士団の任務へ挑んでいく。',
 'ヴィンランド・サガ':'幼い頃に父を失ったトルフィンは、戦士として生きる道を選ぶ。復讐を胸に戦場を渡り歩くなかで、戦争や暴力の先にある生き方を問い直していく。',
 'ブルーロック':'日本代表のストライカーを育てるため、全国から集められた高校生たちが特殊な選抜施設に参加する。生き残りを懸けた競争の中で、潔世一は自分だけの武器を探す。',
 '僕のヒーローアカデミア 2nd Season':'雄英高校でヒーローを目指す出久たちは、実力を競う大規模な校内大会に挑む。仲間やライバルとの勝負を通じて、それぞれが自分の課題と向き合っていく。',
 '僕のヒーローアカデミア 3rd Season':'ヒーロー科の生徒たちは、実地訓練や新たな任務を通じて力を磨いていく。出久は自分の能力を使いこなす方法を探りながら、仲間とともに次の試練へ進む。',
 '進撃の巨人 The Final Season':'壁の外に広がる世界と、その歴史を知ったエレンたち。かつての敵味方の立場が揺らぐなか、それぞれが信じる未来を懸けた選択を迫られる。',
 'PSYCHO-PASS サイコパス':'人の心理状態や犯罪の危険性が数値化される社会。新人監視官の常守朱は、犯罪を未然に防ぐ組織で働きながら、正義と社会の仕組みに疑問を抱いていく。',
 '銀魂':'宇宙人の来訪によって大きく変わった江戸の町で、万事屋を営む銀時は仲間とともにさまざまな依頼を引き受ける。騒動の裏で、かつての戦友や強敵との縁も動き始める。',
 '宇宙よりも遠い場所':'南極へ行くという夢を抱く少女は、同じ目標を持つ仲間たちと出会う。高校生の四人は不安や迷いを抱えながら、未知の場所を目指して一歩を踏み出す。',
 '響け！ユーフォニアム':'高校の吹奏楽部に入った黄前久美子は、個性も目標も異なる仲間たちと演奏に取り組む。全国大会を目指すなかで、部員それぞれの思いや葛藤が浮かび上がる。',
 'チェンソーマン':'悪魔が存在する世界で、借金を背負う少年デンジは相棒のポチタと暮らしていた。ある出来事を経て悪魔の力を得たデンジは、公安のデビルハンターとして新たな生活を始める。',
 '進撃の巨人 Season３ Part.2':'壁の外に広がる世界の真実を求め、調査兵団はウォール・マリア奪還作戦に挑む。エレンたちは巨人の力と仲間の犠牲に向き合いながら、人類の歴史を揺るがす秘密へ迫る。',
 'NARUTO -ナルト- 疾風伝':'修行を終えて里へ戻ったうずまきナルトは、仲間とともに大切な人を救うための任務に挑む。各地で暗躍する組織との戦いを通じ、忍の世界を揺るがす大きな争いへ巻き込まれていく。',
 '僕のヒーローアカデミア３':'雄英高校でヒーローを目指す緑谷出久たちは、林間合宿で力を伸ばそうとする。しかし、敵連合の襲撃によって生徒たちは危機に陥り、ヒーロー社会を揺るがす事件へ発展する。',
 'ホリミヤ':'学校では明るく人気者の堀京子と、普段は目立たないが意外な一面を持つ宮村伊澄。互いの素顔を知った二人は、友人たちとの交流を通じて少しずつ距離を縮めていく。',
 'とらドラ！':'目つきの鋭さから誤解されがちな高須竜児は、同級生の逢坂大河と出会う。互いの片思いを応援するため協力を始めた二人は、学校や家庭での出来事を通じて関係を変えていく。',
 'アカメが斬る！':'帝都の腐敗を目の当たりにした青年タツミは、暗殺集団ナイトレイドと出会う。仲間たちとともに圧政を敷く帝国へ立ち向かい、危険な戦いに身を投じていく。',
 'ノラガミ':'社も信者もいない貧乏な神・夜トは、いつか自分の社を持つことを夢見て小さな依頼をこなしている。人間の少女ひよりや神器の雪音との出会いから、神々と妖の世界に関わっていく。',
 'けいおん！':'廃部寸前の軽音部に入部した平沢唯は、秋山澪・田井中律・琴吹紬らとバンド活動を始める。楽器初心者の唯も、放課後の練習やお茶の時間を重ねながら、仲間と音楽を楽しんでいく。',
 'とある科学の超電磁砲':'学園都市で暮らす電撃使いの少女・御坂美琴は、仲間たちと日常を送る一方、街で起きる不可解な事件に巻き込まれていく。能力開発の裏側に隠された計画へと迫る物語。',
 '86―エイティシックス―':'隣国との戦争を続ける共和国では、無人兵器とされる機体を少数民族の少年少女たちが操縦していた。指揮官となったレーナは、戦場の実態と仲間たちの想いに向き合う。',
 'Fate/stay night: Unlimited Blade Works':'聖杯を巡り、魔術師たちが英霊を召喚して戦う聖杯戦争。高校生の衛宮士郎はセイバーと契約し、遠坂凛や他のマスターたちと関わりながら、自らの理想と戦いの意味を問い直す。',
 '僕のヒーローアカデミア４':'ヒーロー科の緑谷出久は、プロヒーローのサー・ナイトアイのもとでインターンに参加する。そこで出会った少女エリを救うため、仲間たちと危険な敵に立ち向かう。',
 '七つの大罪':'王国を救うため、王女エリザベスはかつて国を裏切ったとされる騎士団「七つの大罪」を探す旅に出る。団長メリオダスたちと出会い、王国を脅かす陰謀へ立ち向かっていく。',
 'BLEACH':'霊が見える高校生・黒崎一護は、死神の少女ルキアとの出会いをきっかけに死神の力を得る。人間を襲う虚から人々を守りながら、死神たちの世界に関わる事件へ巻き込まれていく。',
 '鬼滅の刃 無限列車編':'炭治郎たちは炎柱・煉獄杏寿郎とともに、乗客が次々と消える無限列車へ乗り込む。眠りを利用する鬼の術に立ち向かいながら、乗客たちを守るために戦う。',
 'ダーリン・イン・ザ・フランキス':'荒廃した未来で、少年少女たちは巨大兵器フランクスに乗り込み、謎の巨大生物と戦っていた。居場所を失った少年ヒロは、ゼロツーとの出会いから再び戦う意味を見つけていく。',
 '寄生獣 セイの格率':'人間の脳を奪って身体を乗っ取る寄生生物が現れる。右手だけを寄生された高校生・泉新一は、ミギーと名付けた存在と奇妙な共生関係を築き、人間を襲う寄生生物と対峙する。',
 '新世紀エヴァンゲリオン':'謎の巨大生命体「使徒」が襲来する世界で、少年・碇シンジは巨大な人型兵器エヴァンゲリオンの操縦者となる。仲間たちと戦いながら、組織ネルフと人類補完計画の秘密に近づいていく。',
 '鬼滅の刃 遊郭編':'音柱・宇髄天元とともに遊郭へ潜入した炭治郎、善逸、伊之助。人々に紛れて活動する鬼の正体を探りながら、上弦の鬼との激しい戦いに挑む。',
 '炎炎ノ消防隊':'人体が突然燃え上がり、炎を操る怪物となる現象が発生する世界。特殊消防隊に所属する森羅日下部は、仲間とともに焔ビトを鎮めながら、現象の背後にある謎を追う。',
 '千と千尋の神隠し':'引っ越しの途中で不思議な世界へ迷い込んだ少女・千尋は、両親を救うため、神々が集う湯屋で働くことになる。さまざまな出会いを通じて、千尋は自分の力で困難に立ち向かっていく。',
 'ジョジョの奇妙な冒険 (TV)':'名門ジョースター家の青年ジョナサンは、養子として迎えられたディオと対立する。石仮面を巡る事件をきっかけに、二人の因縁は世代を越える戦いへとつながっていく。',
 'カウボーイビバップ':'賞金稼ぎたちが宇宙船ビバップ号に乗り、太陽系を渡り歩きながら犯罪者を追う。スパイクやジェットたちは仕事を重ねる一方、それぞれが抱える過去と向き合うことになる。',
 'ワンパンマン 2':'どんな敵も一撃で倒すヒーローのサイタマは、弟子のジェノスやヒーロー協会の仲間たちと活動を続ける。怪人たちの動きが活発になるなか、武術家ガロウの存在が新たな脅威となる。',
 '転生したらスライムだった件':'通り魔に襲われた会社員は、異世界でスライムのリムルとして目を覚ます。仲間を増やしながら種族の違いを越えて共存できる国を築こうとし、各地の勢力と関わっていく。',
 'デス・パレード':'死後の行き先を決めるため、亡くなった人々は謎のバーへ招かれ、命を懸けたゲームに参加する。審判役のデキムは、参加者の行動や記憶を通じて人間の本質を見極めようとする。',
 '盾の勇者の成り上がり':'異世界に召喚された岩谷尚文は、四聖勇者の一人である盾の勇者として旅立つ。しかし仲間の裏切りで信用を失い、ラフタリアとの出会いをきっかけに困難な道を歩み始める。',
 '青の祓魔師':'自分が魔神サタンの血を引くと知った奥村燐は、祓魔師になることを決意する。正十字学園で仲間と学びながら、悪魔と人間の世界を巡る戦いに身を投じていく。',
 'ソードアート・オンライン II':'仮想世界の銃撃ゲームで、プレイヤーが現実でも命を落とす事件が起きる。調査を依頼されたキリトは、狙撃手シノンと出会い、事件の謎を追う。',
 'ようこそ実力至上主義の教室へ':'生徒の評価が実力と成果で決まる高度育成高等学校。目立たないように過ごす綾小路清隆は、個性豊かなクラスメイトとともに、クラス間の競争や学校の仕組みに向き合う。',
 'モブサイコ100 II':'超能力を持つ少年モブは、師匠の霊幻や仲間との日々を通じて、自分の感情と向き合い続ける。強大な力を持つ者たちとの衝突の中で、モブは人としての成長を試される。',
 '進撃の巨人 The Final Season Part 2':'世界の歴史と敵対する国々の事情が明らかになるなか、エレンの行動を巡って仲間たちの考えは分かれていく。人類の未来を左右する決断が迫られる。',
 '呪術廻戦 0':'幼なじみを失った乙骨憂太は、強い呪いを抱えたまま東京都立呪術高等専門学校へ入学する。仲間や五条悟との出会いを通じて、自分の力と向き合い始める。',
 'その着せ替え人形は恋をする':'雛人形づくりを好む高校生・五条新菜は、クラスメイトの喜多川海夢からコスプレ衣装の制作を頼まれる。異なる趣味を持つ二人は、ものづくりを通じて交流を深めていく。',
 'Charlotte(シャーロット)':'思春期の一部の少年少女に、限られた条件で発現する特殊能力が存在する。能力を使っていた乙坂有宇は、生徒会の仲間と出会い、能力者たちを巡る出来事に関わっていく。',
 '未来日記':'周囲の出来事を予知する日記を手にした中学生・天野雪輝は、ほかの日記所有者たちと生き残りを懸けたゲームに参加する。謎の少女・我妻由乃と行動をともにしながら、ゲームの主催者の目的へ迫っていく。',
 '僕のヒーローアカデミア５':'雄英高校でヒーローを目指す緑谷出久たちは、合同戦闘訓練を通じて互いの成長を確かめる。出久の中に眠る新たな力や、敵連合を巡る動きが明らかになっていく。',
 '東京喰種[トーキョーグール]√A':'人間を喰らう喰種が潜む東京で、半喰種となった金木研は自らの居場所を求めて選択を迫られる。人間側の捜査官と喰種たちの対立が激しさを増すなか、彼の決断が物語を動かしていく。',
 'メイドインアビス':'巨大な縦穴「アビス」の探窟家を目指す少女リコは、記憶を失ったロボットの少年レグと出会う。母を探すため、二人は危険と謎に満ちた深層へ旅立つ。',
 'メイドインアビス 烈日の黄金郷':'深界六層へ到達したリコ、レグ、ナナチは、独自の価値観を持つ成れ果てたちが暮らす村にたどり着く。村の秘密と過去の出来事を知る中で、三人はアビスのさらなる謎に向き合う。',
 '食戟のソーマ':'料理人を目指す幸平創真は、名門料理学校・遠月学園へ入学する。厳しい課題や料理勝負に挑みながら、仲間やライバルとの出会いを通じて料理の腕を磨いていく。',
 'ハイキュー!! セカンドシーズン':'春高予選を目指す烏野高校バレー部は、東京での合同合宿に参加する。日向と影山をはじめとする部員たちは、強豪校との練習を通じて新たな課題を見つけ、チームとして成長していく。',
 'ダンジョンに出会いを求めるのは間違っているだろうか':'迷宮都市オラリオで冒険者を目指す少年ベル・クラネルは、小さな神ヘスティアと出会いファミリアに加わる。仲間との冒険や強敵との戦いを通じて、ベルは急速に成長していく。',
 'はたらく魔王さま!':'異世界で敗れた魔王サタンは、現代の東京へ逃れ、笹塚のファストフード店で働き始める。勇者エミリアも人間界に現れ、二人は慣れない日常と異世界の因縁に向き合う。',
 'ジョジョの奇妙な冒険 スターダストクルセイダース':'謎の力に目覚めた空条承太郎は、仲間たちとともにエジプトを目指す旅へ出る。宿敵DIOを倒すため、各地で待ち受けるスタンド使いたちとの戦いに挑む。',
 'MONSTER':'手術の方針を巡って病院の権力と対立した天才外科医テンマは、かつて救った少年が恐ろしい事件に関わっていることを知る。彼は少年の行方を追い、各地で起こる謎の事件を調べ始める。',
 '化物語':'高校生の阿良々木暦は、怪異に関わる少女たちと出会い、それぞれが抱える不思議な問題に向き合う。忍野メメの助けを借りながら、言葉と対話を通じて怪異の謎を解いていく。',
 '終わりのセラフ':'未知のウイルスによって大人が失われ、吸血鬼が人間を支配する世界。孤児院の仲間を奪われた百夜優一郎は、吸血鬼に対抗する日本帝鬼軍へ入り、復讐を誓う。',
 '小林さんちのメイドラゴン':'会社員の小林は、ある夜に出会ったドラゴンのトールをメイドとして家に迎える。人間の暮らしに慣れないトールや仲間のドラゴンたちとの交流が、賑やかな日常を生み出していく。',
 'ヲタクに恋は難しい':'隠れオタクの会社員・桃瀬成海は、転職先で幼なじみの二藤宏嵩と再会する。趣味を理解し合える二人は、ゲームやイベントを楽しみながら不器用な関係を築いていく。',
 '五等分の花嫁':'家計の事情から家庭教師を引き受けた上杉風太郎は、勉強が苦手な五つ子の姉妹を担当する。個性も考え方も異なる五人と向き合いながら、全員の卒業を目指して奮闘する。',
 '古見さんは、コミュ症です。':'人付き合いが苦手な古見硝子は、クラスメイトの只野仁人と出会う。友達を百人作るという目標に向かって、少しずつ周囲との交流を広げていく。',
 '約束のネバーランド':'孤児院で幸せに暮らしていたエマたちは、ある日、自分たちの生活に隠された恐ろしい真実を知る。仲間を守るため、知恵を絞って施設からの脱出を計画する。',
 '約束のネバーランド2':'施設から脱出したエマたちは、鬼が支配する外の世界で生き延びる方法を探す。仲間との再会を目指しながら、人間と鬼を巡る世界の仕組みに向き合っていく。',
 '陰の実力者になりたくて！':'裏で物語を操る存在に憧れる少年シドは、異世界に転生して自ら作った設定を演じ始める。彼の冗談のような組織は、知らぬ間に本物の陰謀とつながっていく。',
 '不滅のあなたへ':'地上に投げ込まれた不死の存在は、出会った生き物の姿や性質を取り込みながら世界を旅する。人々との出会いと別れを重ね、感情や生きる意味を学んでいく。',
 'ジョジョの奇妙な冒険 ダイヤモンドは砕けない':'杜王町に暮らす東方仗助は、町で起こる不可解な事件に立ち向かう。スタンド能力を持つ仲間たちと協力し、平穏な町に潜む危険な人物の正体を追う。',
 'ハイスクールDxD':'悪魔や天使、堕天使が存在する世界で、普通の高校生だった兵藤一誠は命を落とした後、悪魔として生まれ変わる。リアス・グレモリーの眷属となり、仲間たちとさまざまな勢力の争いに関わっていく。',
 'ハイスクールD×D':'悪魔や天使、堕天使が存在する世界で、普通の高校生だった兵藤一誠は命を落とした後、悪魔として生まれ変わる。リアス・グレモリーの眷属となり、仲間たちとさまざまな勢力の争いに関わっていく。',
 'フルーツバスケット':'母を亡くした女子高生・本田透は、草摩家の人々と出会い、彼らが十二支にまつわる不思議な呪いを抱えていることを知る。透の優しさが、家族の秘密や心の傷に変化をもたらしていく。',
 'ノラガミ ARAGOTO':'夜トとひより、雪音は、神々や妖を巡る事件に関わりながら絆を深めていく。毘沙門天との因縁や神器たちの過去が明らかになり、神々の世界に大きな波紋が広がる。',
 'ワンダーエッグ・プライオリティ':'学校へ行けなくなった少女・大戸アイは、不思議な卵を手に入れる。夢の世界で出会う少女たちを救う経験を重ねながら、親友の死に隠された謎と向き合っていく。',
 '氷菓':'省エネ主義の高校生・折木奉太郎は、古典部で出会った千反田えるの好奇心に巻き込まれる。学校生活の身近な謎を、仲間とともに解き明かしていく。',
 'キルラキル':'父の死の真相を追う纏流子は、片太刀バサミを手に本能字学園へ乗り込む。生徒会長の鬼龍院皐月や特殊な制服を巡る戦いの中で、学園に隠された秘密へ迫っていく。',
 'ソウルイーター':'死神武器職人専門学校に通う職人と武器たちは、魂を集めて死神様の武器を完成させるため任務に挑む。仲間との絆を深めながら、世界を脅かす存在に立ち向かう。',
 '暗殺教室':'月の大部分を破壊した謎の生物が、椚ヶ丘中学校の落ちこぼれクラスで教師を務めることになる。生徒たちは卒業までに先生を暗殺するという特別な任務に挑みながら成長していく。',
 '賭ケグルイ':'私立百花王学園では、ギャンブルの強さが生徒の序列を決めていた。転校生の蛇喰夢子は、常識外れの勝負を楽しみながら、学園を支配する生徒会に挑んでいく。',
 '僕のヒーローアカデミア２':'多くの人が個性と呼ばれる能力を持つ社会で、無個性の少年・緑谷出久はヒーローを夢見ている。憧れの人物との出会いを機に、夢への道が開かれる。',
 'ダンダダン':'幽霊を信じる女子高生のモモと、宇宙人を信じるオカルン。互いの主張を確かめようとした二人は、説明のつかない怪異に遭遇し、それぞれ不思議な力と向き合うことになる。',
 'アナザー':'転校生の榊原恒一は、クラスで誰も話しかけようとしない少女・見崎鳴の存在を知る。三年三組に隠された奇妙な決まりと、次々に起こる異変の謎を追っていく。',
 'やはり俺の青春ラブコメはまちがっている。':'人付き合いを避けてきた高校生・比企谷八幡は、教師の勧めで奉仕部に入部する。雪ノ下雪乃や由比ヶ浜結衣とともに、生徒たちの悩みや学校生活の問題に向き合っていく。',
 '天元突破グレンラガン':'人々が地中の村で暮らす世界。気弱な少年シモンは、兄貴分のカミナとともに地上へ出ることを決意し、謎のロボットを手に入れて獣人たちとの戦いに挑む。',
 'FAIRY TAIL':'魔導士を目指す少女ルーシィは、火を操る魔導士ナツとの出会いをきっかけにギルド「妖精の尻尾」に加わる。仲間たちと依頼をこなしながら、さまざまな冒険へ旅立つ。',
 'この素晴らしい世界に祝福を！2':'異世界で冒険者となったカズマは、アクア、めぐみん、ダクネスとともに騒動続きの日々を送る。借金や新たな依頼に追われながら、個性の強い仲間たちと問題を乗り越えていく。',
 '鬼滅の刃 刀鍛冶の里編':'新たな刀を求めて刀鍛冶の里を訪れた炭治郎。霞柱・時透無一郎や恋柱・甘露寺蜜璃と出会うなか、里に上弦の鬼が襲来し、刀鍛冶たちを守る戦いが始まる。',
 'どろろ':'戦乱の世、身体の一部を失って生まれた百鬼丸は、奪われたものを取り戻すため妖怪との戦いを続ける。旅の途中で出会った孤児のどろろとともに、過酷な時代を生き抜いていく。',

 '俺だけレベルアップな件':'異次元と現世界を結ぶ「ゲート」が現れ、ハンターたちがダンジョンに挑む世界。最弱のE級ハンター・水篠旬は、危険な二重ダンジョンで瀕死の重傷を負った後、自分だけがレベルアップする力を得る。',
 'サイバーパンク: エッジランナーズ':'人体改造が一般化し、欲望と暴力が支配する巨大都市ナイトシティ。ある悲劇をきっかけに裏社会へ足を踏み入れた少年デイビッドは、傭兵「エッジランナー」として生きる道を選ぶ。',
 '君の膵臓をたべたい':'他人と距離を置いて暮らす高校生の「僕」は、病院で「共病文庫」と書かれた日記帳を拾う。それはクラスメイトの山内桜良のもので、彼女が膵臓の病気を抱え、残された時間を精一杯生きようとしていることを知る。',
 '地獄楽':'死罪人の画眉丸は、無罪放免と引き換えに不老不死の仙薬を探すため、処刑人の佐切と謎の島へ向かう。島に集められた者たちは、危険な環境と未知の存在に立ち向かう。',
 'コードギアス 反逆のルルーシュ R2':'黒の騎士団とブリタニアの戦いが続く中、ルルーシュは再び仮面の反逆者として動き始める。仲間との関係や世界の行方を左右する新たな陰謀に向き合っていく。',
 '鬼滅の刃 無限列車編 (TV)':'炭治郎、善逸、伊之助は炎柱・煉獄杏寿郎とともに、乗客が次々と眠りに落ちる無限列車へ乗り込む。乗客を守りながら、列車で起きている異変の原因を追う。',
 'ハイキュー!! 烏野高校 VS 白鳥沢学園高校':'春高バレー出場を懸け、烏野高校は宮城県代表決定戦で絶対王者・白鳥沢学園と対戦する。日向や影山たちは、それぞれの強みをぶつけ合う激戦に挑む。',
 '斉木楠雄のΨ難':'強力な超能力を持つ高校生・斉木楠雄は、目立たず平穏に暮らすことを望んでいる。しかし、個性豊かなクラスメイトたちが次々と騒動を起こし、静かな日常は遠のいていく。',
 '天気の子':'東京へ家出してきた高校生・帆高は、祈ると空を晴れにできる少女・陽菜と出会う。異常気象が続く街で、二人は不思議な力と自分たちの選択に向き合っていく。',
 '中二病でも恋がしたい!':'中学時代の言動を忘れたい高校生・富樫勇太は、新しい学校で小鳥遊六花と出会う。彼女の独特な世界観に巻き込まれながら、同級生たちと学校生活を送ることになる。',
 'DEVILMAN crybaby':'心優しい高校生・不動明は、親友の飛鳥了に導かれて悪魔の力を宿した存在となる。人間と悪魔の境界が揺らぐ世界で、明は自分の力や人間性と向き合っていく。',
 'BANANA FISH':'ニューヨークで生きる少年アッシュは、ある言葉「バナナフィッシュ」の謎を追う。日本から来たカメラマン助手・英二との出会いをきっかけに、巨大な陰謀へ巻き込まれていく。',
 '彼女、お借りします':'失恋した大学生・木ノ下和也は、寂しさからレンタル彼女を利用し、水原千鶴と出会う。思いがけない事情から二人の関係は周囲にも知られ、さまざまな人々を巻き込んでいく。',
 '東京喰種-トーキョーグール-:re':'喰種対策局の捜査官・佐々木琲世は、クインクス班の指導役として任務にあたっている。失われた記憶と自分の正体に向き合うなか、人間と喰種を巡る争いが再び動き出す。',
 'ゴブリンスレイヤー':'冒険者になったばかりの女神官は、ゴブリン退治を専門とする風変わりな冒険者と出会う。彼と仲間たちの依頼に同行し、危険な迷宮や村での任務に挑んでいく。',
 'もののけ姫':'山を守るために戦ったアシタカは、呪いを解く手がかりを求めて西へ旅立つ。そこで出会った少女サンと、森を切り開く人々の対立を目の当たりにし、共存の道を探す。',
 '炎炎ノ消防隊 弐ノ章':'人体が突然燃え上がる現象に立ち向かう第8特殊消防隊。森羅たちは焔ビトや伝導者に関わる謎を追い、人体発火の真相とアドラの秘密へ近づいていく。',
 'ジョジョの奇妙な冒険 黄金の風':'イタリアのネアポリスで暮らす青年ジョルノ・ジョバァーナは、ギャング組織に入り、街を変えるという夢を抱く。仲間とともに組織の内部で任務を重ね、強敵との戦いに挑む。',
 'かぐや様は告らせたい-ウルトラロマンティック-':'生徒会長の白銀御行とかぐやは、互いに好意を抱きながらも自分から告白することを譲らない。文化祭を控えた学園で、二人と生徒会メンバーの関係が大きく動いていく。',
 'ハイキュー!! TO THE TOP':'春高バレー全国大会を前に、烏野高校の選手たちはそれぞれの課題に向き合う。日向は強豪校の合宿に参加し、影山も代表候補の練習へ。新たな経験を得て、チームは次の舞台を目指す。',
 'デュラララ!!':'東京・池袋へ引っ越してきた竜ヶ峰帝人は、街で幼なじみや個性豊かな人々と再会する。カラーギャングや都市伝説、謎の存在「首なしライダー」を巡り、街の住人たちの物語が交錯していく。',
 'マッシュル-MASHLE-':'魔法の力が人々の価値を決める世界で、魔法を使えない少年マッシュは鍛え上げた身体能力を持っていた。平穏な暮らしを守るため魔法学校へ入り、数々の試験や強敵に挑んでいく。',
 'ジョジョの奇妙な冒険 スターダストクルセイダース エジプト編':'母を救うため、空条承太郎と仲間たちは宿敵DIOが待つエジプトを目指す。道中でスタンド使いとの戦いを重ねながら、仲間と力を合わせて決戦の地へ進んでいく。',
 '残響のテロル':'東京で大規模な事件を起こした二人の少年は、「スピンクス」と名乗り、謎めいた予告を残す。警察の柴崎は手がかりを追い、少年たちの目的と過去に隠された真実へ迫っていく。',
 'ソードアート・オンライン アリシゼーション':'再び仮想世界へ接続したキリトは、現実と異なる時間が流れる世界で少年ユージオと出会う。元の世界へ戻る方法を探しながら、アンダーワールドに隠された仕組みと秘密を追う。',
 '会長はメイド様!':'男子生徒が多い高校で生徒会長を務める鮎沢美咲は、学校では厳しい態度を見せている。一方、家庭の事情でメイド喫茶でも働いており、その秘密を同級生の碓氷に知られてしまう。',
 '黒子のバスケ':'誠凛高校のバスケ部は、かつて中学バスケ界を席巻した「キセキの世代」の幻の六人目・黒子テツヤを迎える。火神大我とともに、強豪校のライバルたちへ挑んでいく。',
 '怪獣８号':'怪獣が現れる日本で、怪獣専門の清掃業に従事する日比野カフカは、ある出来事をきっかけに怪獣の力を得る。防衛隊への入隊を目指しながら、その正体を隠して仲間と任務に挑む。',
 '学園黙示録HIGHSCHOOL OF THE DEAD':'学校で突如として異変が起こり、平穏な日常は一変する。高校生の小室孝たちは仲間と合流し、安全な場所を求めて混乱する街を進んでいく。',
 '七つの大罪 戒めの復活':'王国を救った七つの大罪は、平和を取り戻した世界で再び仲間と行動をともにする。しかし、強大な力を持つ十戒が現れ、新たな脅威に立ち向かうことになる。',
 'よふかしのうた':'不眠に悩む中学生・夜守コウは、夜の街を歩くうちに自由奔放な少女ナズナと出会う。夜の世界に惹かれたコウは、彼女との交流を通じて自分の望む生き方を探していく。',
 '鬼滅の刃 柱稽古編':'刀鍛冶の里での戦いを終えた炭治郎たちは、来るべき決戦に備えて柱たちのもとで特別な訓練に参加する。鬼殺隊の仲間とともに、それぞれの力を高めていく。',
 '幼女戦記':'魔法と戦争が存在する異世界に転生した元サラリーマンのターニャは、軍人として前線に立つことになる。合理主義を貫き、出世と安全を求めながら軍の作戦に参加していく。',
 'サムライチャンプルー':'自由奔放な剣士ムゲンと冷静な浪人ジンは、ひょんなことから少女フウと旅をすることになる。二人は「向日葵の匂いのする侍」を探し、各地で出会う人々と関わりながら進んでいく。',
 '血界戦線':'異界と人間界が交わる街ヘルサレムズ・ロット。特別な眼を持つ少年レオナルドは、秘密結社ライブラの一員となり、街で起こる超常的な事件に仲間たちと立ち向かう。',
 'となりのトトロ':'父とともに田舎へ引っ越してきたサツキとメイは、自然に囲まれた新しい暮らしを始める。森で不思議な生き物トトロと出会い、身近な自然の中で心に残る体験を重ねていく。',
 '境界の彼方':'人間と妖夢の間に生まれた少年・神原秋人は、ある日、妖夢を討つ一族の少女・栗山未来と出会う。互いに秘密を抱えた二人は、仲間たちとともに不思議な事件へ向き合っていく。',
 'やはり俺の青春ラブコメはまちがっている。続':'奉仕部で活動する比企谷八幡、雪ノ下雪乃、由比ヶ浜結衣は、生徒たちの依頼に応えながら互いの考え方と向き合う。学校行事や人間関係の変化を通じ、三人の関係も揺れ動いていく。',
 'さくら荘のペットな彼女':'問題児が集まる寮「さくら荘」で暮らす高校生・神田空太は、天才画家の椎名ましろを迎えることになる。個性豊かな寮生たちと過ごす中で、夢や才能、将来への悩みに向き合っていく。',
 '僕のヒーローアカデミア６':'ヒーローと敵対勢力の大規模な戦いが迫る中、雄英高校の生徒たちも重要な任務に参加する。緑谷出久たちは仲間と力を合わせ、社会を揺るがす危機に立ち向かっていく。',
 '無職転生Ⅱ ～異世界行ったら本気だす～':'新たな人生を歩むルーデウスは、家族を探す旅の手がかりを求めて魔法大学へ向かう。仲間との出会いや学びを通じて、自分の過去やこれからの生き方に向き合っていく。',
 'とある科学の超電磁砲S':'学園都市で暮らす御坂美琴は、街で起きている不可解な事件を調べるうちに、ある秘密の計画へ近づいていく。仲間たちと協力しながら、事件の真相を追っていく。',
 'エルフェンリート':'研究施設から脱走した少女ルーシーは、特殊な力を持つ存在として追われていた。記憶を失った別人格の姿でコウタたちと暮らし始めるが、彼女の過去を巡る秘密が少しずつ明らかになる。',
 '魔王学院の不適合者 ～史上最強の魔王の始祖、転生して子孫たちの学校へ通う～':'二千年後に転生した魔王アノスは、魔王学院へ入学する。しかし、圧倒的な力を持つ彼はなぜか不適合者と判定される。仲間と出会いながら、歪められた歴史と自らの転生に隠された謎を追う。',
 'ニセコイ':'ヤクザの組長の息子・一条楽は、転校生の桐崎千棘と出会う。家同士の争いを避けるため、二人は恋人同士を演じることになるが、楽には初恋の相手との約束も残されていた。',
 'イジらないで、長瀞さん':'高校生の先輩は、後輩の長瀞にからかわれる日々を送っている。最初は戸惑っていた先輩も、長瀞や友人たちとの交流を通じて少しずつ自分を変え、二人の距離も変化していく。',
 'オーバーロードⅡ':'異世界に残ったアインズは、ナザリックの支配者として周辺勢力の動向を探る。リザードマンの集落や王国の裏社会など、各地で起こる出来事を通じて、彼の勢力はさらに広がっていく。',
 'ゴールデンタイム':'大学入学を機に上京した多田万里は、同じ大学に通う加賀香子や柳澤光央と出会う。過去の記憶を失った万里は、新しい人間関係を築く中で、自分の過去と現在の気持ちに向き合っていく。',
 'モブサイコ100 Ⅲ':'強大な超能力を持つ影山茂夫は、師匠の霊幻新隆のもとで相談所の仕事を手伝いながら成長していく。進路や将来に悩む中、街に広がる巨大なブロッコリーを巡って新たな異変が起こる。',
 '鋼の錬金術師':'錬金術が発達した世界で、エドワードとアルフォンスの兄弟は失った身体を取り戻す方法を探して旅を続ける。国家錬金術師となったエドは、賢者の石の手がかりを追う中で国家の秘密へ近づいていく。',
 'ハウルの動く城':'帽子店で働くソフィーは、ある出来事をきっかけに老婆の姿へ変えられてしまう。呪いを解く方法を探す中で、魔法使いハウルの動く城に身を寄せ、戦争が広がる世界で不思議な仲間たちと暮らし始める。',
 '神之塔 -Tower of God-':'塔の外で暮らしてきた少年・夜は、大切な友人を追って謎に満ちた塔へ足を踏み入れる。各階で課される試験に挑みながら、個性豊かな仲間と出会い、塔に隠された秘密へ近づいていく。',
 'THE GOD OF HIGH SCHOOL ゴッド・オブ・ハイスクール':'高校生のジン・モリは、最強の高校生を決める大会「ゴッド・オブ・ハイスクール」に参加する。さまざまな格闘技を使う選手たちと競い合う中で、大会の背後にある大きな謎が明らかになっていく。',
 'ガチアクタ':'スラム街で暮らす少年ルドは、ある事件をきっかけに奈落へ落とされる。そこで出会った清掃屋の仲間たちと行動をともにし、廃棄物から生まれる怪物や世界の仕組みに立ち向かっていく。',
 'となりの怪物くん':'勉強一筋の水谷雫は、隣の席の問題児・吉田春にプリントを届けたことから交流を始める。正反対の二人は、友人たちとの関わりを通じて少しずつ互いの気持ちや学校生活に向き合っていく。',
 '青春ブタ野郎はゆめみる少女の夢を見ない':'梓川咲太と桜島麻衣の前に、かつて出会った牧之原翔子が再び現れる。思春期症候群を巡る不思議な出来事が、咲太の過去や大切な人たちとの未来に関わっていく。',
 '黒執事':'名門ファントムハイヴ家の若き当主シエルには、完璧な執事セバスチャンが仕えている。女王の番犬として裏社会の事件を調査する二人は、ヴィクトリア朝の街に潜むさまざまな謎を追う。',
 'ReLIFE':'仕事を辞めて先の見えない日々を送る海崎新太は、社会復帰を支援する実験「リライフ」に参加する。薬によって高校生の姿となり、もう一度一年間の高校生活を送りながら人間関係を築いていく。',
 'ドラゴンボールZ':'地球で暮らす孫悟空の前に、宇宙から新たな強敵たちが現れる。仲間や家族とともに地球や宇宙の危機へ立ち向かいながら、悟空たちは次々と強敵との戦いに挑んでいく。',
 '魔法科高校の劣等生':'魔法が技術として発展した世界で、司波達也と妹の深雪は魔法科高校へ入学する。評価制度や学内の対立に直面しながら、二人はそれぞれの能力を生かして事件に関わっていく。',
 '食戟のソーマ 弍ノ皿':'料理人を育てる遠月学園に通う幸平創真は、秋の選抜をはじめとする厳しい課題に挑む。個性豊かな料理人たちとの勝負を通じて、料理の技術と自分だけの表現を磨いていく。',
 'プラスティックメモリーズ':'人間と見分けがつかないアンドロイド「ギフティア」が普及した世界。新人職員の水柿ツカサは、パートナーのアイラとともに、寿命を迎えるギフティアを回収する仕事に向き合う。',
 '桜蘭高校ホスト部':'名門・桜蘭高校に特待生として入学した藤岡ハルヒは、校内のホスト部で高価な花瓶を壊してしまう。弁償のため部員として働くことになり、個性豊かなメンバーや生徒たちと交流していく。',
 'BEASTARS':'肉食獣と草食獣が共に暮らす学園で、心優しいハイイロオオカミのレゴシは、周囲との関係に悩んでいた。ウサギのハルとの出会いをきっかけに、種族間の緊張や自分自身の感情と向き合っていく。',
 'ハイキュー!! TO THE TOP 2':'春高バレー全国大会に進んだ烏野高校は、強豪校との連戦に挑む。日向や影山たちは仲間との連携を深めながら、全国の舞台で新たな相手と競い合っていく。',
 'serial experiments lain':'岩倉玲音は、クラスメイトから届いたメールをきっかけに、ネットワーク「ワイヤード」と現実世界の境界に疑問を抱く。周囲で起こる奇妙な現象を追いながら、自分の存在と世界の仕組みに迫っていく。',
 'Dragon Ball Z':'地球で暮らす孫悟空の前に、宇宙から新たな強敵たちが現れる。仲間や家族とともに地球や宇宙の危機へ立ち向かいながら、悟空たちは次々と強敵との戦いに挑んでいく。',
 'The Irregular at Magic High School':'魔法が技術として発展した世界で、司波達也と妹の深雪は魔法科高校へ入学する。評価制度や学内の対立に直面しながら、二人はそれぞれの能力を生かして事件に関わっていく。',
 'Mahouka Koukou no Rettousei':'魔法が技術として発展した世界で、司波達也と妹の深雪は魔法科高校へ入学する。評価制度や学内の対立に直面しながら、二人はそれぞれの能力を生かして事件に関わっていく。',
 '食戟のソーマ 弐ノ皿':'料理人を育てる遠月学園に通う幸平創真は、秋の選抜をはじめとする厳しい課題に挑む。個性豊かな料理人たちとの勝負を通じて、料理の技術と自分だけの表現を磨いていく。',
 'Shokugeki no Souma: Ni no Sara':'料理人を育てる遠月学園に通う幸平創真は、秋の選抜をはじめとする厳しい課題に挑む。個性豊かな料理人たちとの勝負を通じて、料理の技術と自分だけの表現を磨いていく。',
 'Food Wars! The Second Plate':'料理人を育てる遠月学園に通う幸平創真は、秋の選抜をはじめとする厳しい課題に挑む。個性豊かな料理人たちとの勝負を通じて、料理の技術と自分だけの表現を磨いていく。',
 'Plastic Memories':'人間と見分けがつかないアンドロイド「ギフティア」が普及した世界。新人職員の水柿ツカサは、パートナーのアイラとともに、寿命を迎えるギフティアを回収する仕事に向き合う。',
 'Ouran High School Host Club':'名門・桜蘭高校に特待生として入学した藤岡ハルヒは、校内のホスト部で高価な花瓶を壊してしまう。弁償のため部員として働くことになり、個性豊かなメンバーや生徒たちと交流していく。',
 'ビースターズ':'肉食獣と草食獣が共に暮らす学園で、心優しいハイイロオオカミのレゴシは、周囲との関係に悩んでいた。ウサギのハルとの出会いをきっかけに、種族間の緊張や自分自身の感情と向き合っていく。',
 'Haikyuu!! To the Top 2nd Season':'春高バレー全国大会に進んだ烏野高校は、強豪校との連戦に挑む。日向や影山たちは仲間との連携を深めながら、全国の舞台で新たな相手と競い合っていく。',
 'ハイキュー!! TO THE TOP 第2クール':'春高バレー全国大会に進んだ烏野高校は、強豪校との連戦に挑む。日向や影山たちは仲間との連携を深めながら、全国の舞台で新たな相手と競い合っていく。',
 '新世紀エヴァンゲリオン劇場版 Air/まごころを、君に':'使徒との戦いを終えた後、碇シンジは自分の存在や他者との関係に向き合えずにいた。一方、ゼーレは人類補完計画を進めるためネルフ本部への攻勢を開始し、シンジたちは人類の未来を左右する最終局面に巻き込まれていく。',
 '進撃の巨人 The Final Season完結編 前編':'壁の外に人類が存在する真実を知ったエレンたちは、世界の歴史と向き合うことになる。自由を求めるエレンの選択が仲間たちとの関係を揺るがし、物語は最後の局面へと進んでいく。',
 'BLACK LAGOON':'日本の商社に勤める岡島緑郎は、東南アジアで運び屋集団「ラグーン商会」に拉致される。会社に見捨てられた彼は、レヴィ、ダッチ、ベニーと行動を共にし、裏社会の街ロアナプラで危険な依頼に関わっていく。',
 '君に届け':'周囲から「貞子」と呼ばれ距離を置かれている黒沼爽子は、誰にでも分け隔てなく接する風早翔太に憧れている。風早やクラスメイトとの交流を通して、爽子は友情や恋を知り、自分の殻を少しずつ破っていく。',
 '秒速５センチメートル':'小学生の頃に心を通わせた遠野貴樹と篠原明里は、転校によって離れ離れになる。手紙や再会への思いを抱えながら成長する二人と、貴樹を見つめる人々の時間を、三つの連作で描く。',
 'チェンソーマン レゼ篇':'悪魔の心臓を持つデンジは、公安対魔特異4課のデビルハンターとして働いている。雨宿りの際にカフェで働く少女レゼと出会い、急速に親しくなるが、その出会いを境に日常が変わり始める。',
 'デート・ア・ライブ':'精霊と呼ばれる少女たちが現れると空間震が発生し、人類に脅威をもたらす世界。五河士道は精霊とデートして心を通わせ、キスによってその力を封印するという方法で、彼女たちと世界を救おうとする。',
 'トニカクカワイイ':'高校受験を控えた少年・由崎星空は、ある日出会った不思議な少女・司に一目惚れする。思い切って告白したナサに司が返した条件は「結婚してくれたら付き合う」というもの。二人の新婚生活が始まる。',
 'オーバーロードⅢ':'サービス終了を迎えたはずの仮想現実ゲームからログアウトできなくなったモモンガは、異世界でアインズ・ウール・ゴウンとして活動を続ける。ナザリックの勢力を広げるなか、彼は自らの名と力を世界に示そうとする。',
 '言の葉の庭':'靴職人を目指す高校生・タカオは、雨の日に日本庭園で謎めいた年上の女性・ユキノと出会う。雨の日だけ顔を合わせる二人は、少しずつ心を通わせながら、それぞれが抱える悩みや居場所のなさと向き合っていく。',
 'PERFECT BLUE':'アイドルグループを卒業し女優へ転身した霧越未麻は、望まない仕事や新しい役柄に戸惑いながら歩み始める。周囲で不可解な出来事が起こり、演じる役と現実の境界が揺らいでいく心理サスペンス。',
 '魔法使いの嫁':'特別な力を持ちながら居場所を見つけられずにいた15歳の少女・羽鳥チセは、異形の魔法使いエリアスの弟子として迎えられる。魔法使いの暮らしや人々との出会いを通じて、チセは自分にとって大切なものを少しずつ見つけていく。',
 'ダンジョンに出会いを求めるのは間違っているだろうかⅡ':'迷宮都市オラリオで、女神ヘスティアの眷族として冒険を続けるベル・クラネル。急速な成長によって注目を集めたベルは、神々や他の眷族との新たな争いに巻き込まれていく。',
 'この素晴らしい世界に祝福を！紅伝説':'カズマたちのもとに、めぐみんとゆんゆんの故郷・紅魔の里が危機に瀕しているという知らせが届く。仲間たちは里を救うために旅立つが、そこでは思いがけない騒動が待ち受けていた。',
 '落第騎士の英雄譚（キャバルリィ）':'魔力を武器に変えて戦う魔導騎士を育てる学園で、能力の低さから「落第騎士」と呼ばれる黒鉄一輝は、皇女ステラとの決闘をきっかけに実力を認められていく。剣技を磨く一輝は、騎士の頂点を目指して強敵に挑む。',
 '日常':'時定高校に通うゆっこ、みお、まいの周りでは、ロボットや鹿など不思議な出来事が次々と起こる。一方、東雲研究所では、はかせとなの、しゃべる猫の阪本が、少し変わった日々を送っている。',
 'ギルティクラウン':'アポカリプスウイルスの流行後、GHQの統治下に置かれた日本。高校生の桜満集は、歌姫・楪いのりとの出会いをきっかけに、他者の心に宿る力を引き出す能力を得て、国の運命を左右する争いに巻き込まれていく。',
 '地縛少年 花子くん':'かもめ学園の七不思議に願いを叶える「トイレの花子さん」がいると知った八尋寧々は、旧校舎の女子トイレで花子さんを呼び出す。しかし現れたのは男の子の幽霊・花子くんだった。寧々は花子くんと関わるうちに、学園に伝わる怪異の謎へと近づいていく。',
 '賭ケグルイ××':'勝負の結果が生徒の序列を左右する私立百花王学園。生徒会長・桃喰綺羅莉が一族を招集したことで、蛇喰夢子たちは新たな対戦相手と学園の主導権をめぐる勝負に巻き込まれていく。',
 'ドラゴンボール':'山奥で暮らす少年・孫悟空は、七つ集めると願いが叶うというドラゴンボールを探す少女ブルマと出会う。二人は各地を巡る旅に出て、さまざまな仲間や強敵と出会いながら成長していく。',
 'とんがり帽子のアトリエ':'魔法に憧れる普通の少女ココは、魔法使いキーフリーの秘密を知ったことをきっかけに、彼の弟子としてアトリエで学ぶことになる。仲間たちと魔法の仕組みを探究するなかで、ココは魔法使いの世界に隠された秘密へと足を踏み入れていく。',
 'やはり俺の青春ラブコメはまちがっている。完':'奉仕部で活動を続けてきた比企谷八幡、雪ノ下雪乃、由比ヶ浜結衣。雪乃から最後の依頼を受けた八幡と結衣は、卒業を前にプロムの準備へ協力することになり、それぞれが本当に望む関係と答えを探していく。',
 'ダンジョン飯':'迷宮の奥で妹ファリンを失った冒険者ライオスは、仲間とともに再びダンジョンへ向かう。食料や資金が足りない一行は、迷宮にいる魔物を調理して食べながら、妹を救うために奥深くへ進んでいく。',
 'AKIRA':'翌年に東京オリンピックを控えたネオ東京で、バイクチームのリーダー・金田は、仲間の鉄雄が軍に連れ去られたことを知る。やがて鉄雄に異変が起こり、街の過去に隠された「アキラ」をめぐる謎が動き始める。',
 'ＣＬＡＮＮＡＤ ~After Story~ クラナド アフターストーリー':'高校を卒業した岡崎朋也と古河渚は、学校の外で新しい生活を始める。仕事や家族との暮らしを通じて、二人は大人としての責任や人生の変化に向き合っていく。',
 'シュタインズ・ゲート ゼロ':'紅莉栖を救えなかった世界線で、岡部倫太郎は失意から立ち直れずにいた。人工知能システム「Amadeus」に保存された紅莉栖の記憶と出会ったことで、彼の日常は再び世界線をめぐる出来事に巻き込まれていく。',
 '山田くんとLv999の恋をする':'恋人に別れを告げられた女子大生・茜は、気分転換に始めたオンラインゲームで、同じギルドに所属する高校生プレイヤー・山田と出会う。そっけない態度の山田と交流するうち、茜の生活は少しずつ変わっていく。',
 '３月のライオン':'高校生でプロ棋士の桐山零は、将棋の対局や棋士仲間との関係に悩みながら、一人暮らしを続けている。川本家の三姉妹や周囲の人々との交流を通じて、零は少しずつ人とのつながりを取り戻していく。',
 '時々ボソッとロシア語でデレる隣のアーリャさん':'成績優秀でクールなアーリャは、隣の席の政近に時折ロシア語で本音を漏らす。政近はその言葉を理解しているが、気づいていないふりを続ける。二人の距離と周囲の人間関係が、生徒会をめぐる出来事の中で変化していく。',
 'キズナイーバー':'痛みを感じない高校生・阿形勝平は、謎の少女・園崎法子に導かれ、クラスメイトたちと痛みを共有する「キズナシステム」に参加させられる。互いの感覚を共有するなかで、彼らは自分自身や他者との関係に向き合っていく。',
 'ドラゴンボール超':'魔人ブウとの戦いを終え、平和を取り戻した地球。長い眠りから目覚めた破壊神ビルスが「超サイヤ人ゴッド」を探し始めたことで、悟空たちは新たな強敵や未知の宇宙の存在と出会っていく。',
 '薫る花は凛と咲く':'周囲から怖がられ、人と距離を置いていた紬凛太郎は、実家のケーキ店で和栗薫子と出会う。隣り合う男子校と女子校の間には深い溝があるが、偏見なく接してくれる薫子との交流が、凛太郎の日々を変えていく。',
 '王様ランキング':'耳が聞こえず、力も弱い第一王子ボッジは、王の器ではないと周囲から見なされていた。初めての友達となるカゲとの出会いをきっかけに、ボッジは小さな勇気を積み重ね、自分の道を歩み始める。',
 '僕のヒーローアカデミア THE MOVIE ～2人の英雄～':'夏休み、緑谷出久とオールマイトは、世界中の研究者が集まる巨大人工島「I・アイランド」を訪れる。そこで出会った少女メリッサと交流するなか、島の警備システムが乗っ取られ、人々を巻き込む計画が動き出す。',
 'ヴァニタスの手記':'吸血鬼の青年ノエは、吸血鬼に呪いを広めるという魔導書「ヴァニタスの書」を探してパリへ向かう。旅の途中で、吸血鬼専門の医師を名乗る人間ヴァニタスと出会い、二人は呪いに苦しむ吸血鬼たちの謎を追っていく。',
 '暁のヨナ':'高華王国の王女ヨナは、ある出来事をきっかけに城を離れ、護衛のハクとともに旅へ出る。国の現状を知りながら、伝説に語られる四龍の戦士たちを探し、王女として自分にできることを見つけていく。',
 'ギヴン':'音楽への情熱を失いかけていた高校生ギタリスト・上ノ山立夏は、壊れたギターを抱える同級生・佐藤真冬と出会う。真冬の歌声に心を動かされた立夏は、彼を自分のバンドに誘い、仲間たちと音楽に向き合っていく。',
 '蛍火の杜へ':'幼い頃、山で迷子になった竹川蛍は、人に触れられない不思議な少年・ギンと出会う。毎年夏に森を訪れるようになった蛍は、ギンとの交流を通じて、限られた時間のなかで育まれる大切な関係を知っていく。',
 '慎重勇者～この勇者が俺ＴＵＥＥＥくせに慎重すぎる～':'新米女神リスタは、難度の高い異世界を救うため、能力の高い勇者・竜宮院聖哉を召喚する。しかし聖哉は驚くほど慎重で、十分に準備が整うまで行動しようとしない。正反対の二人による異世界救済の旅が始まる。',
 'はたらく細胞':'人間の体内を舞台に、赤血球や白血球をはじめとする細胞たちの日常と働きを描く。酸素を運ぶ赤血球、体を守る白血球など、さまざまな細胞が協力しながら、体内で起こる出来事に対応していく。',
 '斉木楠雄のΨ難 2':'強力な超能力を持つ高校生・斉木楠雄は、目立たず平穏に暮らしたいと考えている。しかし、個性的なクラスメイトたちが次々と騒動を起こし、彼の日常はなかなか落ち着かない。第2期でも、仲間たちとの新たな出来事が続いていく。',
 '男子高校生の日常':'男子校に通うタダクニ、ヒデノリ、ヨシタケを中心に、友人や周囲の人々との何気ない学校生活を描く。くだらない遊びや思いつきから始まる騒動が、男子高校生らしい勢いで繰り広げられる。',
 'おおかみこどもの雨と雪':'大学生の花は、おおかみおとこと恋に落ち、二人の間に雪と雨という姉弟が生まれる。父を失った花は、子どもたちが人間として生きるか、おおかみとして生きるかを自分で選べるよう、自然に囲まれた田舎で育てていく。',
 '泣きたい私は猫をかぶる':'中学2年生の笹木美代は、同級生の日之出賢人に思いを寄せ、毎日積極的に話しかけている。ある日、不思議なお面の力で猫に変身できるようになった美代は、猫の姿で日之出に近づくうちに、自分の気持ちや居場所について考えるようになる。',
 '蟲師':'人の理解を超えた生命「蟲」が存在する世界。蟲師のギンコは各地を旅し、蟲が引き起こす不思議な現象に悩む人々と出会い、その原因を探りながら解決の道を見つけていく。',
 'デッドマン・ワンダーランド':'無実の罪で死刑判決を受けた五十嵐丸太は、民間刑務所「デッドマン・ワンダーランド」へ送られる。囚人たちが命懸けの見世物に参加する施設で、丸太は自分に宿った不思議な力と刑務所の秘密を知っていく。',
 'Deadman Wonderland':'無実の罪で死刑判決を受けた五十嵐丸太は、民間刑務所「デッドマン・ワンダーランド」へ送られる。囚人たちが命懸けの見世物に参加する施設で、丸太は自分に宿った不思議な力と刑務所の秘密を知っていく。',
 '監獄学園':'女子生徒が多くを占める私立八光学園に入学した男子生徒五人は、校内で問題を起こして懲罰棟へ収監される。厳しい監視のもと、彼らは退学を避けるために脱獄計画を立てる。',
 '監獄学園〈プリズンスクール〉':'女子生徒が多くを占める私立八光学園に入学した男子生徒五人は、校内で問題を起こして懲罰棟へ収監される。厳しい監視のもと、彼らは退学を避けるために脱獄計画を立てる。',
 'Prison School':'女子生徒が多くを占める私立八光学園に入学した男子生徒五人は、校内で問題を起こして懲罰棟へ収監される。厳しい監視のもと、彼らは退学を避けるために脱獄計画を立てる。',
 'アオハライド':'中学時代に気持ちを伝えられなかった吉岡双葉は、高校で初恋の相手・田中洸と再会する。しかし洸は以前とは違う雰囲気をまとっていた。双葉は友人たちとの関係や自分の気持ちに向き合っていく。',
 'Ao Haru Ride':'中学時代に気持ちを伝えられなかった吉岡双葉は、高校で初恋の相手・田中洸と再会する。しかし洸は以前とは違う雰囲気をまとっていた。双葉は友人たちとの関係や自分の気持ちに向き合っていく。',
 '政宗くんのリベンジ':'過去に太っていたことを理由に振られた真壁政宗は、努力して別人のような姿となり、かつて自分を拒んだ安達垣愛姫の前に現れる。政宗は復讐を計画するが、学園生活の中で思いがけない感情に揺れる。',
 'Masamune-kun no Revenge':'過去に太っていたことを理由に振られた真壁政宗は、努力して別人のような姿となり、かつて自分を拒んだ安達垣愛姫の前に現れる。政宗は復讐を計画するが、学園生活の中で思いがけない感情に揺れる。',
 'ゾン100～ゾンビになるまでにしたい100のこと～':'ブラック企業で働く天道輝は、ある朝、街がゾンビであふれていることに気づく。会社へ行かなくてよくなった彼は、やりたいことを100個書き出し、限られた時間を自分らしく生きようとする。',
 'Zom 100: Bucket List of the Dead':'ブラック企業で働く天道輝は、ある朝、街がゾンビであふれていることに気づく。会社へ行かなくてよくなった彼は、やりたいことを100個書き出し、限られた時間を自分らしく生きようとする。',
 'Chivalry of a Failed Knight':'魔力を武器に変えて戦う魔導騎士を育てる学園で、能力の低さから「落第騎士」と呼ばれる黒鉄一輝は、皇女ステラとの決闘をきっかけに実力を認められていく。剣技を磨く一輝は、騎士の頂点を目指して強敵に挑む。',
 'Is It Wrong to Try to Pick Up Girls in a Dungeon? II':'迷宮都市オラリオで、女神ヘスティアの眷族として冒険を続けるベル・クラネル。急速な成長によって注目を集めたベルは、神々や他の眷族との新たな争いに巻き込まれていく。',
 'KonoSuba: Legend of Crimson':'カズマたちのもとに、めぐみんとゆんゆんの故郷・紅魔の里が危機に瀕しているという知らせが届く。仲間たちは里を救うために旅立つが、そこでは思いがけない騒動が待ち受けていた。',
 'ログ・ホライズン':'老舗オンラインゲーム「エルダー・テイル」に多数のプレイヤーが閉じ込められた。大学院生のシロエは仲間とギルドを結成し、混乱する都市で秩序を取り戻しながら、この世界の仕組みを探っていく。',
 'ぐらんぶる':'大学進学を機に伊豆へ移り住んだ北原伊織は、叔父のダイビングショップで暮らし始める。大学のダイビングサークルや仲間たちとの出会いを通じて、予想外に騒がしい大学生活を送る。',
 'orange':'高校2年生の高宮菜穂のもとに、10年後の自分から手紙が届く。手紙に書かれた後悔を繰り返さないよう、菜穂は転校生の成瀬翔や仲間たちと向き合い、未来を変えようとする。',
 '五等分の花嫁∬':'高校生の上杉風太郎は、勉強が苦手な中野家の五つ子の家庭教師を続けている。性格も得意分野も異なる五人と向き合いながら、全員の卒業を目指して奮闘する。',
 'SK∞ エスケーエイト':'スケートボードが好きな高校生のレキは、転校生のランガを、閉鎖された鉱山で行われる秘密のレース「S」へ誘う。個性豊かなスケーターたちとの勝負を通じ、二人は競技の魅力と自分の可能性を見つけていく。',
 'ダンガンロンパ 希望の学園と絶望の高校生 The Animation':'超一流の才能を持つ生徒が集まる希望ヶ峰学園に入学した苗木誠は、仲間たちとともに校舎へ閉じ込められる。学園長を名乗るモノクマが突きつけた奇妙なルールのもと、生徒たちは事件の真相を探り始める。',
 'ありふれた職業で世界最強':'クラスメイトと異世界へ召喚された南雲ハジメは、戦闘向きではない錬成師の能力を授かる。迷宮の深部で孤立した彼は、生き延びる方法を探すなかで仲間と出会い、世界を旅することになる。',
 'ユーリ!!! on ICE':'グランプリファイナルで敗れたフィギュアスケーターの勝生勇利は、故郷で競技を続けるか迷っていた。そこへ世界的な王者ヴィクトルが現れ、勇利のコーチを申し出たことで、新たなシーズンが始まる。',
 'ノーゲーム・ノーライフ ゼロ':'すべての種族が争う大戦の時代、人間たちは存亡の危機に追い込まれていた。人間の若き指導者リクは、機械仕掛けの少女シュヴィと出会い、世界を変えるため協力することになる。',
 'マギ The labyrinth of magic':'不思議な力を持つ少年アラジンは、旅の途中でアリババと出会い、財宝が眠る迷宮の攻略を目指す。さまざまな国や人々との出会いを通じて、二人は自分たちに託された運命へ近づいていく。',
 'GREAT PRETENDER':'自称・日本一の天才詐欺師である枝村真人は、ある詐欺をきっかけにフランス人のローランと出会う。世界各地を舞台に、悪人を標的とした大規模な騙し合いへ巻き込まれていく。',
 '食戟のソーマ 餐ノ皿':'名門料理学校・遠月学園で腕を磨く幸平創真は、実地研修や強豪料理人との勝負を通じて新たな課題に挑む。仲間やライバルとの料理対決の中で、自分だけの料理を追い求めていく。',
 '東京喰種-トーキョーグール-:re 2':'CCGの捜査官として活動していた佐々木琲世は、自らの過去と正体に関わる記憶を取り戻していく。人間と喰種の対立が激化する中、仲間たちとともに戦いの行方を左右する決断を迫られる。',
 'Tokyo Ghoul:re 2nd Season':'CCGの捜査官として活動していた佐々木琲世は、自らの過去と正体に関わる記憶を取り戻していく。人間と喰種の対立が激化する中、仲間たちとともに戦いの行方を左右する決断を迫られる。',
 'アキラ':'翌年に東京オリンピックを控えたネオ東京で、バイクチームのリーダー・金田は、仲間の鉄雄が軍に連れ去られたことを知る。やがて鉄雄に異変が起こり、街の過去に隠された「アキラ」をめぐる謎が動き始める。',
 'マギ':'不思議な力を持つ少年アラジンは、旅の途中でアリババと出会い、財宝が眠る迷宮の攻略を目指す。さまざまな国や人々との出会いを通じて、二人は自分たちに託された運命へ近づいていく。',
 'Magi: The Labyrinth of Magic':'不思議な力を持つ少年アラジンは、旅の途中でアリババと出会い、財宝が眠る迷宮の攻略を目指す。さまざまな国や人々との出会いを通じて、二人は自分たちに託された運命へ近づいていく。',
 'グレートプリテンダー':'自称・日本一の天才詐欺師である枝村真人は、ある詐欺をきっかけにフランス人のローランと出会う。世界各地を舞台に、悪人を標的とした大規模な騙し合いへ巻き込まれていく。',
 'Dungeon Meshi':'迷宮の奥で妹ファリンを失った冒険者ライオスは、仲間とともに再びダンジョンへ向かう。食料や資金が足りない一行は、迷宮にいる魔物を調理して食べながら、妹を救うために奥深くへ進んでいく。',
 'Delicious in Dungeon':'迷宮の奥で妹ファリンを失った冒険者ライオスは、仲間とともに再びダンジョンへ向かう。食料や資金が足りない一行は、迷宮にいる魔物を調理して食べながら、妹を救うために奥深くへ進んでいく。',
 'Shokugeki no Souma: San no Sara':'名門料理学校・遠月学園で腕を磨く幸平創真は、実地研修や強豪料理人との勝負を通じて新たな課題に挑む。仲間やライバルとの料理対決の中で、自分だけの料理を追い求めていく。',
 'Food Wars! The Third Plate':'名門料理学校・遠月学園で腕を磨く幸平創真は、実地研修や強豪料理人との勝負を通じて新たな課題に挑む。仲間やライバルとの料理対決の中で、自分だけの料理を追い求めていく。',
 'My Teen Romantic Comedy SNAFU Climax':'奉仕部で活動を続けてきた比企谷八幡、雪ノ下雪乃、由比ヶ浜結衣。雪乃から最後の依頼を受けた八幡と結衣は、卒業を前にプロムの準備へ協力することになり、それぞれが本当に望む関係と答えを探していく。',
 'サカモトデイズ':'かつて伝説の殺し屋として恐れられた坂本太郎は、引退して家族と平穏な日々を送っていた。しかし、過去を知る者たちが次々と現れ、坂本は大切な日常を守るため再び騒動に巻き込まれていく。',
 'SAKAMOTO DAYS':'かつて伝説の殺し屋として恐れられた坂本太郎は、引退して家族と平穏な日々を送っていた。しかし、過去を知る者たちが次々と現れ、坂本は大切な日常を守るため再び騒動に巻き込まれていく。',
 '天国大魔境':'未曾有の大災害から15年後、荒廃した日本を旅するキルコとマルは「天国」を探していた。一方、壁に囲まれた施設で暮らす子供たちも外の世界に疑問を抱き始め、二つの物語が交差していく。',
 'リコリス・リコイル':'犯罪を未然に防ぐ秘密組織DAのエージェント「リコリス」の井ノ上たきなは、ある事件をきっかけに喫茶リコリコへ転属する。自由奔放な千束とコンビを組み、店に舞い込むさまざまな依頼に取り組む。',
 'すずめの戸締まり':'九州の静かな町に暮らす17歳の岩戸鈴芽は、扉を探す旅の青年・宗像草太と出会う。災いを招く扉を閉じるため、鈴芽は不思議な出来事に導かれながら日本各地を巡る。',
 'BORUTO-ボルト- NARUTO NEXT GENERATIONS':'七代目火影となったうずまきナルトの息子ボルトは、忍者学校で仲間たちと学びながら任務に挑む。新しい時代の忍として成長する一方、父との関係や忍界に迫る異変に向き合っていく。',
 'Boruto: Naruto Next Generations':'七代目火影となったうずまきナルトの息子ボルトは、忍者学校で仲間たちと学びながら任務に挑む。新しい時代の忍として成長する一方、父との関係や忍界に迫る異変に向き合っていく。',
 'ドメスティックな彼女':'高校生の藤井夏生は、憧れの教師・橘陽菜への想いを抱えながら、合コンで出会った橘瑠衣と関係を持つ。やがて家庭の事情で二人が義姉妹となり、夏生は複雑な人間関係と恋心に向き合う。',
 '僕のヒーローアカデミア THE MOVIE 〜2人の英雄〜':'緑谷出久とオールマイトは、世界中のヒーローが集まる巨大人工移動都市I・アイランドを訪れる。そこで出会った少女メリッサと過ごす中、島を襲う事件に巻き込まれ、仲間とともに危機へ立ち向かう。',
 '月刊少女野崎くん':'高校生の佐倉千代は、想いを寄せる野崎梅太郎に告白するが、なぜか漫画のファンだと勘違いされる。野崎が少女漫画家だと知った千代は、アシスタントとして個性的な仲間たちと制作を手伝う。',
 'ソードアート・オンライン アリシゼーション War of Underworld':'アンダーワールドで深い傷を負ったキリトが動けない中、アリスは人界を守るために戦いへ身を投じる。暗黒界の軍勢が迫る大戦の中、仲間たちはそれぞれの想いを胸に世界の命運を懸けて戦う。',
 '可愛いだけじゃない式守さん':'高校生の和泉くんは、恋人の式守さんと穏やかな学校生活を送っている。普段は可愛らしい式守さんだが、和泉くんが困ったときには頼もしい一面を見せ、友人たちとの日常を重ねていく。',
 'Ranking of Kings':'耳が聞こえず、力も弱い第一王子ボッジは、王の器ではないと周囲から見なされていた。初めての友達となるカゲとの出会いをきっかけに、ボッジは小さな勇気を積み重ね、自分の道を歩み始める。',
 'Dragon Ball Super':'魔人ブウとの戦いを終え、平和を取り戻した地球。長い眠りから目覚めた破壊神ビルスが「超サイヤ人ゴッド」を探し始めたことで、悟空たちは新たな強敵や未知の宇宙の存在と出会っていく。',
 '殺戮の天使':'記憶を失った少女レイチェルは、見知らぬ建物の地下で目を覚ます。脱出を目指す彼女は、死神のような鎌を持つザックと出会い、各階に待ち受ける謎を解きながら出口を探していく。',
 'Angels of Death':'記憶を失った少女レイチェルは、見知らぬ建物の地下で目を覚ます。脱出を目指す彼女は、死神のような鎌を持つザックと出会い、各階に待ち受ける謎を解きながら出口を探していく。',
 'Yona of the Dawn':'高華王国の王女ヨナは、ある出来事をきっかけに城を離れ、護衛のハクとともに旅へ出る。国の現状を知りながら、伝説に語られる四龍の戦士たちを探し、王女として自分にできることを見つけていく。',
 'BLEACH 千年血戦篇':'尸魂界に異変が起き、死神たちは滅却師の組織・見えざる帝国からの侵攻を受ける。黒崎一護は仲間たちとともに新たな敵へ立ち向かい、死神と滅却師の過去に隠された真実へ迫っていく。',
 'Bleach: Thousand-Year Blood War':'尸魂界に異変が起き、死神たちは滅却師の組織・見えざる帝国からの侵攻を受ける。黒崎一護は仲間たちとともに新たな敵へ立ち向かい、死神と滅却師の過去に隠された真実へ迫っていく。',
 'Given':'音楽への情熱を失いかけていた高校生ギタリスト・上ノ山立夏は、壊れたギターを抱える同級生・佐藤真冬と出会う。真冬の歌声に心を動かされた立夏は、彼を自分のバンドに誘い、仲間たちと音楽に向き合っていく。',
 'NANA-ナナ-':'東京へ向かう列車で出会った二人の女性、同じ名前を持つ大崎ナナと小松奈々。偶然にも同じ部屋で暮らし始めた二人は、音楽や恋愛、仕事を通じて互いの人生に深く関わっていく。',
 '下ネタという概念が存在しない退屈な世界':'公序良俗を厳しく管理する社会で、奥間狸吉は風紀を守る学校に入学する。そこで過激な活動を行う少女・華城綾女と出会い、社会の規則や表現の自由を巡る騒動に巻き込まれていく。',
 'フリクリ':'思春期の少年ナオ太は、平凡な日常を送る町で謎めいた女性ハル子と出会う。彼女との遭遇をきっかけに、ナオ太の身の回りでは奇妙な出来事が続き、町に隠された秘密が動き始める。',
 'FLCL':'思春期の少年ナオ太は、平凡な日常を送る町で謎めいた女性ハル子と出会う。彼女との遭遇をきっかけに、ナオ太の身の回りでは奇妙な出来事が続き、町に隠された秘密が動き始める。',
 '異世界魔王と召喚少女の奴隷魔術':'オンラインゲームの姿のまま異世界へ召喚された坂本拓真は、魔王ディアヴロとして振る舞うことになる。召喚した二人の少女と旅を始めた彼は、異世界の仕組みや迫り来る問題に向き合っていく。',
 'How Not to Summon a Demon Lord':'オンラインゲームの姿のまま異世界へ召喚された坂本拓真は、魔王ディアヴロとして振る舞うことになる。召喚した二人の少女と旅を始めた彼は、異世界の仕組みや迫り来る問題に向き合っていく。',
 '世界最高の暗殺者、異世界貴族に転生する':'かつて世界最高と呼ばれた暗殺者は、女神との契約によって異世界の貴族の家に転生する。新たな名を持つ彼は、暗殺術と魔法を身につけながら、将来現れる勇者を倒すという使命に備えていく。',
 'The World\'s Finest Assassin Gets Reincarnated in Another World as an Aristocrat':'かつて世界最高と呼ばれた暗殺者は、女神との契約によって異世界の貴族の家に転生する。新たな名を持つ彼は、暗殺術と魔法を身につけながら、将来現れる勇者を倒すという使命に備えていく。',
 '劇場版「鬼滅の刃」無限城編 第一章 猗窩座再来':'鬼殺隊は鬼舞辻無惨を追って無限城へと突入し、上弦の鬼たちとの決戦に臨む。炭治郎や仲間たちは、それぞれの因縁を抱えながら、鬼の始祖を倒すための戦いに身を投じていく。',
 'N・H・Kにようこそ！':'大学を中退して引きこもり生活を送る佐藤達広は、自分の境遇を陰謀のせいだと考えていた。ある日、彼の前に現れた中原岬は、佐藤を社会復帰させようと働きかけ、二人の奇妙な交流が始まる。',
 'Welcome to the N.H.K.':'大学を中退して引きこもり生活を送る佐藤達広は、自分の境遇を陰謀のせいだと考えていた。ある日、彼の前に現れた中原岬は、佐藤を社会復帰させようと働きかけ、二人の奇妙な交流が始まる。',
 '火垂るの墓':'戦争末期の日本で、兄の清太と妹の節子は親を失い、二人で暮らすことになる。厳しい状況の中、清太は幼い妹を守りながら、居場所と生活を求めて懸命に日々を過ごす。',
 'Grave of the Fireflies':'戦争末期の日本で、兄の清太と妹の節子は親を失い、二人で暮らすことになる。厳しい状況の中、清太は幼い妹を守りながら、居場所と生活を求めて懸命に日々を過ごす。',
 '七つの大罪 神々の逆鱗':'ブリタニアを巡る戦いが続く中、メリオダスたちは魔神族との因縁や十戒の秘密に向き合う。仲間たちはそれぞれの過去と使命を背負い、王国と大切な人々を守るために戦い続ける。',
 'The Seven Deadly Sins: Wrath of the Gods':'ブリタニアを巡る戦いが続く中、メリオダスたちは魔神族との因縁や十戒の秘密に向き合う。仲間たちはそれぞれの過去と使命を背負い、王国と大切な人々を守るために戦い続ける。',
 'ロクでなし魔術講師と禁忌教典(アカシックレコード)':'名門魔術学院で非常勤講師となったグレンは、やる気のない態度で生徒たちを困らせていた。しかし、教え子のシスティーナやルミアと関わる中で、彼は魔術の知識と意外な実力を見せていく。',
 'Akashic Records of Bastard Magic Instructor':'名門魔術学院で非常勤講師となったグレンは、やる気のない態度で生徒たちを困らせていた。しかし、教え子のシスティーナやルミアと関わる中で、彼は魔術の知識と意外な実力を見せていく。',
 '涼宮ハルヒの憂鬱':'普通の高校生キョンは、入学早々に涼宮ハルヒと出会う。宇宙人や未来人、超能力者を探すハルヒが設立したSOS団に加わったことで、キョンの日常には不思議な出来事が次々と起こり始める。',
 'The Melancholy of Haruhi Suzumiya':'普通の高校生キョンは、入学早々に涼宮ハルヒと出会う。宇宙人や未来人、超能力者を探すハルヒが設立したSOS団に加わったことで、キョンの日常には不思議な出来事が次々と起こり始める。',
 'ダンジョンに出会いを求めるのは間違っているだろうかⅢ':'迷宮都市オラリオで冒険を続けるベル・クラネルは、言葉を話すモンスターの少女ウィーネと出会う。人間とモンスターの関係を巡る問題が広がる中、ベルは自分の信念と向き合うことになる。',
 'Is It Wrong to Try to Pick Up Girls in a Dungeon? III':'迷宮都市オラリオで冒険を続けるベル・クラネルは、言葉を話すモンスターの少女ウィーネと出会う。人間とモンスターの関係を巡る問題が広がる中、ベルは自分の信念と向き合うことになる。',
 '91Days':'禁酒法時代、マフィアが支配する街ローレスに、家族を失ったアヴィリオが戻ってくる。謎の手紙をきっかけに復讐を決意した彼は、仇のヴァネッティファミリーへ近づき、その一員であるネロと行動を共にする。',
 '甲鉄城のカバネリ':'不死の怪物カバネが広がる世界で、人々は駅を砦として暮らし、装甲蒸気機関車で移動していた。顕金駅に住む蒸気鍛冶の少年・生駒は、駅を襲ったカバネに立ち向かい、無名や仲間たちと甲鉄城に乗って旅を始める。',
 'ドロヘドロ':'魔法によって頭をトカゲに変えられ、記憶も失った男カイマンは、相棒のニカイドウとともに元の姿を取り戻す手がかりを探していた。魔法使いたちの世界と人間の住む街を行き来する中で、二人は自分たちの過去につながる謎へ迫っていく。',
 'シャングリラ・フロンティア':'少し未来の世界で、数々の難しいゲームを攻略してきた陽務楽郎は、総プレイヤー数の多いVRゲーム「シャングリラ・フロンティア」に挑戦する。サンラクとして広大な世界へ踏み出した彼は、仲間との出会いや強敵との戦いを通じて冒険を広げていく。',
 'WIND BREAKER':'ケンカの強さで頂点を目指す高校生・桜遥は、超不良校として知られる風鈴高校へやってくる。しかし、現在の風鈴高校は「ボウフウリン」として街を守る集団になっていた。仲間や街の人々との出会いを通じ、桜は強さの意味を見つめ直していく。',
 'バッカーノ！':'1930年代のニューヨークで、不死の酒をめぐる出来事をきっかけに、マフィアや泥棒、錬金術師などさまざまな人々の運命が交錯する。大陸横断列車に乗り合わせた乗客たちにも不思議な事件が起こり、複数の物語がつながっていく。',
 '灰と幻想のグリムガル':'暗闇の中で目を覚ましたハルヒロたちは、過去の記憶も帰る場所も分からないまま、見知らぬ世界グリムガルにたどり着く。特別な力を持たない彼らは、義勇兵見習いとして仲間と協力しながら、生きるための方法を学んでいく。',
 'ココロコネクト':'文化研究部に所属する高校生五人は、ある日突然、互いの人格が入れ替わる不思議な現象に巻き込まれる。次々と起こる超常現象を経験する中で、彼らは仲間の知らなかった一面や、それぞれが抱える思いと向き合っていく。',
 '魔女の宅急便':'13歳の魔女キキは、修行のため黒猫ジジと旅立ち、海辺の町コリコで新しい生活を始める。空を飛ぶ力を生かして宅急便を開き、町の人々との交流を通じて自立への一歩を踏み出す。',
 'Free!':'水泳が好きな七瀬遙は、高校で橘真琴や葉月渚と再会し、水泳部を立ち上げる。かつての仲間である松岡凛との再会をきっかけに、仲間たちと練習や大会に挑みながら、泳ぐことの意味を見つめ直す。',
 '崖の上のポニョ':'海辺の町で暮らす5歳の宗介は、海からやって来た不思議な生き物ポニョと出会う。人間になりたいと願うポニョの行動をきっかけに、町の周囲で大きな変化が起こり始める。',
 '山田くんと7人の魔女':'私立高校に通う問題児・山田竜は、成績優秀な白石うららとの偶然の出来事をきっかけに、キスで発動する不思議な能力を知る。学校にいる七人の魔女を探すうち、仲間たちと奇妙な事件に巻き込まれていく。',
 '中二病でも恋がしたい！戀':'中二病を卒業したい高校生・富樫勇太は、現役中二病の小鳥遊六花と付き合い始める。高校2年生になった二人は、同居生活や新たな仲間との出会いを通じて、恋人としての関係に向き合っていく。',
 '赤髪の白雪姫':'珍しい赤い髪を持つ薬草師の白雪は、王子の求婚を避けて隣国へ旅立ち、森で第二王子ゼンと出会う。自分の力で道を切り開こうとする白雪は、宮廷薬剤師を目指しながらゼンや仲間たちとの絆を深めていく。',
 'ジョゼと虎と魚たち':'絵や本に囲まれて暮らすジョゼは、大学生の鈴川恒夫に助けられたことをきっかけに交流を始める。互いに衝突しながらも距離を縮め、ジョゼは憧れていた外の世界へ踏み出そうとする。',
 'ソードアート・オンライン -オーディナル・スケール-':'仮想世界のゲームに閉じ込められた事件から2年後、現実世界ではARを使った新作ゲーム「オーディナル・スケール」が人気を集めていた。アスナたちがゲームを始める一方、プレイヤーに起きる異変を知ったキリトも調査に乗り出す。',
 '徒然チルドレン':'高校生たちの恋愛模様を描くオムニバス作品。告白できない生徒や気持ちをうまく伝えられない生徒など、さまざまなカップルのすれ違いや成長を短編形式で描く。',
 '坂本ですが?':'学校中の注目を集める高校生・坂本は、どんな出来事にも独自の工夫で対処し、周囲を驚かせる。クラスメイトや先輩たちとの日常を通して、彼の洗練された振る舞いが次々と騒動を生み出していく。',
 '僕のヒーローアカデミア 7':'ヒーローと敵の全面衝突が続く中、雄英高校の緑谷出久たちは仲間と協力しながら最終決戦に臨む。デクと死柄木弔の対決を軸に、各地でヒーローたちがそれぞれの信念を懸けて戦う。',
 'この素晴らしい世界に祝福を！３':'魔王軍幹部を倒してアクセルへ戻ったカズマたちのもとに、王女アイリスから冒険譚を聞きたいという手紙が届く。王都でアイリスと出会ったカズマは、王城での暮らしを楽しむ一方、王都で起きる事件に巻き込まれていく。',
 '狼と香辛料':'行商人クラフト・ロレンスは、故郷へ帰りたい賢狼ホロと旅を続ける。北を目指す道中で商機を求めて港町へ立ち寄り、交易都市や新たな人々との出会いを通じて、商いと二人の絆を深めていく。',
 'Vivy -Fluorite Eye’s Song-':'歌で人々を幸せにする使命を持つ自律型AIヴィヴィの前に、100年後の未来から来たAIマツモトが現れる。未来に起こる人間とAIの戦争を防ぐため、ヴィヴィは歴史を変える旅に踏み出す。',
 '杖と剣のウィストリア':'魔法が使えない少年ウィルは、幼なじみとの約束を果たすため魔法学院で学び、剣を手に魔導士の頂点を目指す。仲間と挑む実習や試験を通じて、学院での評価を高めていく。',
 'フルーツバスケットThe Final':'草摩家の人々と暮らす本田透は、長年一族を縛る呪いを解こうと向き合い続けていた。草摩慊人の秘密を知ったことで、透たちはそれぞれの過去や絆と向き合い、物語は最終章へ進む。',
 '月が導く異世界道中':'女神に異世界へ召喚された深澄真は、勇者の称号を取り上げられて荒野へ追放される。竜や蜘蛛など人ならざる存在と出会い、従者となった巴や澪とともに、さまざまな種族が暮らす世界を旅していく。',
 '僕のヒーローアカデミア THE MOVIE ヒーローズ:ライジング':'雄英高校1年A組の生徒たちは、離島での校外ヒーロー活動に参加する。島に現れた強敵ナインと対峙することになり、クラス全員で協力して島の人々を守ろうとする。',
 '犬夜叉':'戦国時代へ迷い込んだ現代の中学生・日暮かごめは、封印されていた半妖の少年・犬夜叉と出会う。砕け散った四魂の玉の欠片を集めるため、二人は仲間たちと各地を旅する。',
 '痛いのは嫌なので防御力に極振りしたいと思います。':'友人に誘われてVRMMOを始めた楓は、痛みを避けようと能力値を防御力に集中させ、メイプルとして冒険を始める。独特なプレイスタイルから思いがけない能力を獲得し、仲間とともにゲーム内のイベントへ挑戦していく。',
 'GHOST IN THE SHELL / 攻殻機動隊':'西暦2029年、情報ネットワークが社会を覆う近未来。公安9課に所属する草薙素子は、人の記憶や行動に干渉する謎のハッカー「人形使い」を追う捜査に乗り出す。事件を追う中で、彼女自身の存在にも関わる問いが浮かび上がる。',
 '賢者の孫':'現代日本で暮らしていた青年は、異世界で赤ん坊として生まれ変わり、賢者マーリンに育てられる。15歳になったシンは魔法の力を身につけたものの世間の常識を知らず、友人を作るため高等魔法学院へ入学する。',
 '終わりのセラフ　名古屋決戦編':'新宿で再会したミカエラが吸血鬼になっていたことを知った優一郎は、家族や仲間を守るため、彼を人間に戻す方法を探す。一方、東京に迫る吸血鬼の動きを受け、グレンたちは名古屋での作戦に向かう。',
 'GATE 自衛隊 彼の地にて、斯く戦えり':'東京・銀座に突如現れた異世界への門から、異世界の住民や怪物が現れる。事態が収まった後、オタク自衛官の伊丹耀司は第三偵察隊を率いて門の向こうの特地へ向かい、現地の人々との交流を通じて異世界の実情を探っていく。',
 '干物妹！うまるちゃん':'学校では容姿端麗で成績も優秀な土間うまるは、家に帰ると兄のタイヘイの前でゲームや漫画を楽しむ、ぐうたらな妹に変わる。兄やクラスメイトとの日常を通じて、家の中と外で違ううまるの姿が描かれる。',
 'トモちゃんは女の子！':'高校生の相沢智は、幼なじみの久保田淳一郎に想いを伝えるが、彼は智を親友としてしか見ていなかった。女の子として意識してもらおうと奮闘する智は、もう一人の幼なじみ・群堂みすずに相談しながら学校生活を送る。',
 'お隣の天使様にいつの間にか駄目人間にされていた件':'一人暮らしを始めた高校生の藤宮周は、雨の中にいた隣人の椎名真昼に傘を貸す。周の生活を心配した真昼は食事や掃除を手伝うようになり、隣同士の二人は少しずつ交流を深めていく。',
 '輪るピングドラム':'双子の兄弟・冠葉と晶馬は、病弱な妹の陽毬と暮らしている。ある日、陽毬に起きた不思議な出来事をきっかけに、三人は謎のペンギンたちと「運命」を巡る奇妙な出来事に巻き込まれていく。',
 'SHIROBAKO':'アニメ制作会社で働く宮森あおいは、仲間たちと一本の作品を完成させるため、制作進行として日々奮闘する。現場で起こるトラブルや人々の思いを通じて、アニメが作られるまでの過程を描く。',
 'オッドタクシー':'平凡な毎日を送るタクシー運転手の小戸川は、乗客との何気ない会話を重ねている。さまざまな人物の事情が交差するなか、ある少女の失踪事件をきっかけに街の秘密がつながり始める。',
 '映像研には手を出すな！':'アニメーションに強い憧れを持つ浅草みどりは、同級生の水崎ツバメ、金森さやかと出会い、映像研究同好会を立ち上げる。三人はそれぞれの得意分野を生かし、自分たちの理想のアニメ制作に挑む。',
 '夏目友人帳':'妖怪を見ることができる少年・夏目貴志は、祖母の遺品「友人帳」を受け継ぐ。そこに記された妖怪たちへ名前を返すため、ニャンコ先生とともに人や妖怪との出会いを重ねていく。',
 'がっこうぐらし!':'学校で共同生活を送る「学園生活部」の少女たちは、授業や部活動を楽しみながら毎日を過ごしている。しかし、彼女たちの穏やかな学校生活には、外の世界に関わる大きな秘密が隠されている。',
 '小市民シリーズ':'過去の経験から目立たず穏やかに暮らしたいと考える小鳩常悟朗と小佐内ゆき。小市民を目指して高校生活を送る二人だが、身近で起こる小さな謎や事件に次々と関わっていく。',
 'ひぐらしのなく頃に':'昭和58年、山あいの雛見沢村へ引っ越してきた前原圭一は、仲間たちとの賑やかな日々を楽しんでいた。毎年の祭りの時期に起こる不可解な事件を知り、村に隠された謎を追い始める。',
 'ゆるキャン△':'一人で静かにキャンプを楽しむ志摩リンは、富士山の近くで各地を巡る少女・各務原なでしこと出会う。野外活動サークルの仲間たちも加わり、景色や食事を楽しむキャンプの日々が広がっていく。',
 'パリピ孔明':'現代の渋谷に転生した三国時代の軍師・諸葛孔明は、歌手を目指す月見英子と出会う。英子の夢をかなえるため、孔明は軍師としての知略を生かし、音楽業界でさまざまな作戦を立てる。',
 'おそ松さん':'松野家の六つ子は大人になっても定職に就かず、実家で気ままな日々を送っている。個性の強い六人と周囲の人々が巻き起こす、予測不能な騒動を描くコメディ。',
 'たまこまーけっと':'餅屋の娘・北白川たまこは、商店街の人々に囲まれながら高校生活を送っている。ある日、言葉を話す不思議な鳥が現れたことで、たまこと家族、商店街の日常に新たな出来事が加わる。',
  'WORKING!!':'北海道のファミリーレストランで働く小鳥遊宗太は、個性豊かな同僚たちと一緒に店を切り盛りする。仕事中も休憩中も騒動の絶えない職場で、従業員たちの日常が描かれる。',
 'サーバント×サービス':'区役所に就職した新人職員の山神ルーシー、長谷部豊、三好紗耶らは、慣れない仕事に取り組みながら市民のさまざまな相談に対応する。職場の仲間との交流や小さな騒動を描くお仕事コメディ。',
 '弱虫ペダル':'アニメやゲームが好きな高校生・小野田坂道は、ひょんなことから自転車競技部に入部する。仲間やライバルとの練習とレースを通じて、自分でも気づかなかった才能を伸ばしていく。',
 'ツルネ ―風舞高校弓道部―':'中学時代の出来事をきっかけに弓道から離れていた鳴宮湊は、高校で仲間と出会い、再び弓を引くことを決意する。風舞高校弓道部の仲間たちと大会を目指しながら、自分の課題と向き合っていく。',
 '時をかける少女':'高校生の紺野真琴は、ある出来事をきっかけに時間を跳び越える力を手に入れる。日常の失敗をやり直すために能力を使ううち、友人たちとの関係や未来に思いがけない変化が訪れる。',
 '耳をすませば':'読書が好きな中学生の月島雫は、図書館で借りた本の貸出カードに何度も現れる名前が気になり始める。その人物との出会いを通じて、雫は自分の将来や物語を書く夢について考えるようになる。',
 '天空の城ラピュタ':'空から降ってきた不思議な少女シータと、鉱山で働く少年パズーが出会う。二人は空に浮かぶ伝説の島ラピュタを巡る争いに巻き込まれ、その秘密を確かめる旅へ出る。',
 'TRIGUN':'賞金首として知られるヴァッシュ・ザ・スタンピードは、荒廃した砂漠の惑星を旅している。保険調査員の二人と行動をともにするなかで、彼の過去や「人を傷つけない」という信念が明らかになっていく。',
 '新世界より':'千年後の日本では、人々が念動力を使う社会が築かれていた。神栖66町で暮らす子供たちは、学びや日常の中で社会の不自然な決まりに気づき、世界の成り立ちに隠された真実へ近づいていく。',
 'DARKER THAN BLACK -黒の契約者-':'東京に謎の領域「地獄門」が現れた後、特殊な能力と引き換えに代償を支払う契約者が出現する。黒と呼ばれる契約者は、さまざまな組織の依頼を受けながら、世界の秘密を追っていく。',
 'いぬやしき':'平凡な日々を送る初老の会社員・犬屋敷壱郎は、ある出来事を境に人間離れした力を持つ身体へ変わってしまう。同じ力を得た少年との対照的な行動を通じて、力の使い道が問われていく。',
 'ダーウィンズゲーム':'高校生の須藤要は、友人から届いた招待をきっかけにスマートフォンのゲームへ参加する。プレイヤーごとに異なる能力が与えられる謎のゲームで、要は仲間と協力しながら仕組みを探っていく。',
 'ブラック・ブレット':'謎の寄生生物ガストレアによって人類の生活圏が脅かされる近未来。民警の里見蓮太郎は、相棒の藍原延珠とともに依頼をこなしながら、社会に潜む問題や戦いの真相に向き合う。',
 'トリニティセブン':'ある日、日常が崩壊した少年・春日アラタは、幼なじみを救う手がかりを求めて魔導学園へ入学する。そこで出会った七人の魔道士たちと関わりながら、世界に起きた異変の謎を追う。',
 'エロマンガ先生':'ライトノベル作家として活動する高校生・和泉正宗は、作品のイラストを担当する正体不明の絵師「エロマンガ先生」と一緒に仕事をしている。その絵師が義妹の紗霧だと知り、二人の生活と創作活動が動き始める。',
 '冴えない彼女の育てかた':'ゲーム制作を夢見る高校生・安芸倫也は、同級生たちを誘って美少女ゲームの制作チームを結成する。シナリオやイラスト、音楽など、それぞれの得意分野を持つ仲間と作品づくりに挑む。',
 'PUI PUI モルカー':'モルモットが車になった世界で、個性豊かなモルカーたちが街を走り回る。渋滞や買い物など、身近な出来事を舞台にした短編エピソードが展開する。',
 'こねこのチー ポンポンらー大冒険':'好奇心旺盛な子猫のチーと山田家の暮らしを描く3DCGシリーズ。チーは家族や周囲の人々と過ごすなかで、毎日のように新しい発見や出来事に出会う。',
 '魔法騎士レイアース (2026)':'東京タワーで出会った獅堂光、龍咲海、鳳凰寺風の三人は、異世界セフィーロへ召喚される。世界を支えるエメロード姫を救うため、魔法騎士としてそれぞれの力を身につけながら旅に出る。',
 'おじさんはカワイイものがお好き。':'周囲から頼られる会社員・小路三貴には、かわいいキャラクターを愛する秘密の趣味がある。お気に入りのパグ太郎を楽しむ日々の中で、同じ趣味を持つ人々と出会い、自分らしい暮らしを広げていく。',
 'タコピーの原罪':'ハッピーを広めるため地球にやってきた宇宙人タコピーは、小学生の少女・しずかと出会う。彼女の笑顔を取り戻そうと不思議な道具を使って奮闘するが、しずかの周囲には複雑な事情が隠されていた。',
 '乙女ゲームの破滅フラグしかない悪役令嬢に転生してしまった…':'公爵令嬢カタリナは、前世の記憶を取り戻したことで、自分が乙女ゲームの悪役令嬢だと気づく。待ち受ける破滅の結末を避けるため、ゲームの知識を頼りに周囲の人々と関係を築いていく。',
 '俺の妹がこんなに可愛いわけがない':'高校生の高坂京介は、距離のあった妹・桐乃から、誰にも話せない趣味について相談を受ける。妹の秘密を知ったことをきっかけに、京介は彼女の悩みや友人関係に関わっていく。',
 'からかい上手の高木さん':'中学生の西片は、隣の席の高木さんにいつもからかわれている。今度こそ仕返しをしようと作戦を立てるものの、高木さんに先を読まれてしまう、二人の学校生活を描く。',
 '月がきれい':'中学3年生の安曇小太郎と水野茜は、同じクラスになったことをきっかけに少しずつ言葉を交わすようになる。進路や学校行事に向き合いながら、二人は互いを知っていく。',
 '一週間フレンズ。':'長谷祐樹は、クラスメイトの藤宮香織と友達になろうとするが、香織は友達との記憶が一週間で消えてしまうと打ち明ける。それでも祐樹は、毎週あらためて彼女と向き合い、関係を築こうとする。',
 '凪のあすから':'かつて海の中で暮らしていた人々の一部は地上へ移り、異なる生活文化を築いていた。海の学校に通う光、まなか、ちさき、要は学校の統合をきっかけに地上の学校へ通い始め、新しい出会いと変化に直面する。',
 'ガールズ&パンツァー':'戦車を使った伝統競技「戦車道」が大切にされる世界。大洗女子学園に転校した西住みほは、仲間たちとチームを組み、全国大会での勝利を目指して練習と試合に挑む。',
 '交響詩篇エウレカセブン':'退屈な日々を送っていた少年レントンは、謎の少女エウレカとの出会いをきっかけに、反政府組織ゲッコーステイトの旅に加わる。仲間との生活やさまざまな出来事を通じて、世界の秘密と自分の進む道を知っていく。',
 'ゾンビランドサガ':'佐賀県で目を覚ました少女たちは、自分たちがゾンビとしてよみがえったことを知る。謎のプロデューサー・巽幸太郎のもとでアイドルグループ「フランシュシュ」を結成し、佐賀を盛り上げるために活動を始める。',
 'ラブライブ! School idol project':'音ノ木坂学院は入学希望者の減少により、廃校の危機に直面していた。学校を守りたい高坂穂乃果たちは、スクールアイドルとして活動することを決意し、仲間とともにライブや大会を目指す。',
 'ウマ娘 プリティーダービー':'競走馬の名前と魂を受け継いだ「ウマ娘」たちが暮らす世界。トレセン学園に入学したウマ娘たちは、仲間やライバルと切磋琢磨しながら、レースでの勝利と夢の舞台を目指していく。',
 'アイドルマスター':'765プロダクションに所属する13人のアイドル候補生たちは、プロデューサーや仲間と支え合いながらトップアイドルを目指す。レッスンや仕事、ステージでの経験を通じて、それぞれが成長していく。',
 'おしりたんてい':'顔の形がおしりに見える名探偵・おしりたんていは、相棒のブラウンとともに街で起こるさまざまな事件を調査する。鋭い推理で手がかりを集め、難事件をユニークな方法で解決していく。',
 'ソードアート・オンライン アリシゼーション War of Underworld 最終章 (2nd Season)':'キリトが眠り続けるアンダーワールドでは、闇の軍勢が人界への侵攻を開始する。アリスやアスナ、シノン、リーファらは、それぞれの力を結集し、世界の存続と人類の未来を懸けた大戦に挑む。',
 'ジョジョの奇妙な冒険 ストーンオーシャン':'父から贈られたペンダントをきっかけにスタンド能力に目覚めた空条徐倫。刑務所で仲間と出会い、DIOの遺志を継ぐプッチ神父の計画を阻止するため、運命を懸けた戦いに身を投じる。',
 '青の祓魔師 京都不浄王篇':'魔神サタンの血を引くことが知られ、仲間との関係に変化が生じた奥村燐。そんな中、学園に封印されていた不浄王の左目が盗まれ、燐たちは京都を舞台にした事件へ巻き込まれていく。',
 'ホリミヤ -piece-':'堀京子と宮村伊澄をはじめ、片桐高校の生徒たちが過ごす日々。本編では描かれなかった修学旅行や体育祭、友人同士の交流など、彼らの学校生活のさまざまな一幕を描く。',
 'トモダチゲーム':'仲の良い高校生グループは、突然「友達ゲーム」に参加させられる。借金を背負った仲間を救うため、互いを信じるか疑うかを試される心理戦に挑む。',
 'ソードアート・オンライン オルタナティブ ガンゲイル・オンライン':'VRゲーム「ガンゲイル・オンライン」で、プレイヤーのレンは相棒のピトフーイとともに、チーム対抗のバトルロイヤル大会「スクワッド・ジャム」に参加する。',
 '古見さんは、コミュ症です。2':'友達を100人作ることを目標にする古見硝子。只野仁人らクラスメイトとの交流を重ねながら、新たな出会いや学校行事を通じて少しずつ友達の輪を広げていく。',
 '魔入りました！入間くん':'人間であることを隠して魔界の名門校バビルスに通うことになった鈴木入間。個性豊かな悪魔たちに囲まれながら、学校行事や友人との交流を通じて、にぎやかな魔界生活を送っていく。',
 'リトルウィッチアカデミア (TV)':'幼い頃に見た魔女のショーに憧れ、魔女を目指すアッコは名門ルーナノヴァ魔法学校へ入学する。友人たちと魔法を学びながら、授業や学校で起こる騒動に立ち向かっていく。',
 '甘城ブリリアントパーク':'転校生の千斗いすずに誘われて遊園地を訪れた可児江西也は、閉園の危機にある甘城ブリリアントパークの再建を任される。個性的なスタッフと協力し、パークの立て直しに挑む。',
 '富豪刑事 Balance:UNLIMITED':'莫大な資産を持つ神戸大助は、警視庁の現代犯罪対策本部で人情派の刑事・加藤春とコンビを組む。価値観の異なる二人は、さまざまな事件や神戸家にまつわる謎を追っていく。',
 '小林さんちのメイドラゴンＳ':'小林さんの家でメイドとして暮らすドラゴンのトールや、仲間のドラゴンたち。人間社会での生活を楽しむ彼女たちの日常に、新たなドラゴンの登場によって変化が訪れる。',
 '僕は友達が少ない':'学校で友達ができずにいた羽瀬川小鷹は、ひとりで過ごす三日月夜空と出会う。二人は友達作りを目指す「隣人部」を立ち上げ、個性的な部員たちと交流を重ねる。',
 '僕の心のヤバイやつ':'中二病の中学生・市川京太郎は、同じクラスの山田杏奈を遠くから眺めていた。図書室で思いがけず交流するようになり、予想外の一面を知るうちに、彼女が気になる存在になっていく。',
 'takt op.Destiny':'音楽が禁じられた世界では、音楽に惹かれる怪物D2と、それに対抗する少女たち「ムジカート」が存在する。指揮者のタクトはムジカートの運命とともに、荒廃した世界を旅する。',
 '憂国のモリアーティ':'19世紀末のイギリスでは、根強い階級制度によって貴族が大きな権力を握っていた。腐敗した社会を変えようとするウィリアム・ジェームズ・モリアーティは、独自の計画を進めていく。',
 '異世界はスマートフォンとともに。':'神様の手違いで命を落とした望月冬夜は、スマートフォンを持ったまま異世界で新たな人生を始める。さまざまな仲間と出会い、旅を続けるうちに世界の秘密へと近づいていく。',
 '極主夫道':'「不死身の龍」と呼ばれた元極道の龍は、結婚を機に専業主夫となる。家事や近所付き合いに全力で取り組む龍の毎日は、周囲を巻き込む騒動の連続だった。',
 '七つの大罪 聖戦の予兆':'王国を取り戻した七つの大罪とエリザベスたちに、ようやく平穏な日々が訪れる。しかし、次なる脅威の気配が忍び寄るなか、彼らは束の間の日常を過ごしていく。',

 '俺物語!!':'高校生の剛田猛男は、親友の砂川誠と過ごす日々の中で、ある日、困っている少女・大和凜子と出会う。彼女に惹かれた猛男は、友情や恋心と向き合いながら、不器用ながらも真っ直ぐな毎日を送る。',
 'ブルーピリオド':'成績優秀で器用に日々を過ごしていた高校生・矢口八虎は、美術室で一枚の絵に心を動かされる。絵を描く喜びを知った八虎は、東京藝術大学への進学を目指し、仲間やライバルと切磋琢磨しながら美術に向き合っていく。',
 'パプリカ':'精神医療研究所で、他人の夢を共有できる装置が盗まれる事件が起きる。セラピストの千葉敦子は、夢の中で「パプリカ」として患者の治療を行いながら、研究所で相次ぐ異変の謎を追う。',
 'ブレンド・S':'喫茶店「スティーレ」で働くことになった桜ノ宮苺香は、接客時にそれぞれ異なる個性を演じる店員たちと出会う。慣れない仕事に奮闘する苺香と、個性豊かな仲間たちが繰り広げる喫茶店コメディ。',
 '宝石の国':'遠い未来、かつての生物が不死の身体を持つ宝石となった世界。最年少のフォスフォフィライトは、金剛先生から博物誌を編む仕事を任される。新たな役目を通して世界を知るうち、フォスは大きな変化に巻き込まれていく。',
 'アオのハコ':'スポーツ強豪校に通う男子バドミントン部員・猪股大喜は、毎朝の練習で顔を合わせる女子バスケットボール部の先輩・鹿野千夏に惹かれていく。部活動に打ち込む高校生たちの成長と、それぞれの想いを描く青春ストーリー。',
 '神様はじめました':'父親の失踪で住む場所を失った女子高生・桃園奈々生は、公園で出会ったミカゲから社を譲られる。ところがミカゲは土地神で、奈々生は新たな土地神として神社の仕事を引き継ぐことに。神使の巴衛らと過ごしながら、神様として成長していく。',
 '好きっていいなよ。':'人付き合いを避けてきた橘めいは、ある出来事をきっかけに、学校で人気の黒沢大和と知り合う。大和との交流や新しい友人たちとの出会いを通して、めいは少しずつ人との関わり方を学び、自分の気持ちと向き合っていく。',
 'ばらかもん':'東京で活動していた若き書道家・半田清舟は、ある出来事をきっかけに、自然豊かな島で一人暮らしを始める。自由奔放な島の人々、とくに元気な子どもたちとの交流を通して、清舟は書道家としても一人の人間としても少しずつ成長していく。',
 'Fate/stay night':'大火災で家族を失い、魔術師・衛宮切嗣に引き取られた衛宮士郎。十年後、冬木市で起きる聖杯戦争に巻き込まれ、召喚したサーヴァントのセイバーとともに、願いを叶えるという聖杯を巡る戦いへ身を投じる。',
 'GTO':'元暴走族の鬼塚英吉は、教師として新たな人生を歩み始める。問題を抱えたクラスを受け持つことになった鬼塚は、型破りな行動と生徒と同じ目線に立つ姿勢で、学校に起こる騒動へ向き合っていく。',
 '幽☆遊☆白書':'子供を助けようとして命を落とした不良少年・浦飯幽助は、霊界から生き返るための試練を与えられる。試練を乗り越えて霊界探偵となった幽助は、桑原や蔵馬、飛影らとともに、人間界と霊界に関わる事件へ立ち向かう。',
 '偽物語':'夏休みを迎えた阿良々木暦の前に、正義の味方を自称する妹の火憐と月火を巡る怪異が現れる。火憐は「偽物」と対峙し、月火にも不思議な秘密が関わっていた。暦は妹たちを守るため、それぞれの事件に向き合う。',
 '魔女の旅々':'幼いころに読んだ旅の物語に憧れ、若くして魔女となったイレイナは、広い世界を巡る旅に出る。さまざまな国を訪れ、風変わりな人々や誰かの日常に触れながら、出会いと別れを重ねていく。',
 '見える子ちゃん':'女子高生の四谷みこは、ある日突然、普通の人には見えない異形の存在が見えるようになる。恐ろしい存在に気づかれても、みこは見えていないふりを貫き、親友のハナらと過ごす日常を守ろうとする。',
 'オーバーロードⅣ':'異世界に転移したアインズは、魔導国の王として国の統治に悩み、周辺諸国との関係を模索していた。仲間たちの思惑も重なる中、アインズは自らの理想と国の未来を実現するため、新たな行動を起こす。',
 'BTOOOM!':'ネットゲーム「BTOOOM!」に夢中だった坂本竜太は、目を覚ますと見知らぬ島にいた。そこではゲームの仕組みに似た生き残りを懸けた状況に置かれ、竜太は島からの脱出を目指す。',
 '四畳半神話大系':'京都の大学に通う三回生の「私」は、薔薇色のキャンパスライフを夢見ていたが、悪友の小津らに振り回され、思い描いた学生生活を送れずにいた。もし入学時に別のサークルを選んでいたら――。選択の違いから生まれる四つの並行世界を描く青春奇譚。',
 'ポケットモンスター':'マサラタウンに暮らす少年サトシは、ポケモンマスターを目指してピカチュウとともに冒険の旅へ出発する。各地で新たなポケモンや仲間と出会い、ジムでのバトルやさまざまな出来事を経験しながら、夢に向かって旅を続けていく。',
 'ヒナまつり':'壺を愛する若きインテリヤクザ・新田義史のもとに、念動力を使う謎の少女ヒナが突然現れる。共同生活を始めた二人は、学校や組の人々を巻き込みながら、予想外の騒動に次々と遭遇する。',
 'ワンパンマン３':'趣味でヒーローを始めたサイタマは、弟子のジェノスとともにヒーロー協会で活動している。怪人協会が幹部の子供をさらったことを受け、S級ヒーローたちは救出作戦を計画。一方、怪人協会に連れ去られたガロウも新たな局面を迎える。',
 'Ergo Proxy':'環境が汚染された未来、人類は外界から隔絶されたドーム都市で暮らしていた。都市で起きたロボットの暴走事件を調べる情報局員リルは、謎の存在と事件の関係を追い、やがてドームの外へと旅立つ。',
 '進撃の巨人 The Final Season完結編 後編':'エレンは始祖の巨人として無数の巨人を率い、スラトア要塞へ進む。地鳴らしから逃れたミカサやアルミンたちは、世界を脅かすエレンを止めるため、かつての仲間との最後の戦いに挑む。',
 'わたしの幸せな結婚':'継母たちに虐げられて育った斎森美世は、冷酷と噂される軍人・久堂清霞のもとへ嫁ぐ。初めは距離のあった二人だが、日々の暮らしの中で少しずつ互いを理解し、美世は自分の異能と過去にも向き合っていく。',
 '黄泉のツガイ':'山奥の村で狩人として暮らす少年ユルは、双子の妹アサや村人たちと穏やかな日々を送っていた。ある日、村に伝わる謎と外の世界の存在が明らかになり、ユルは自分と妹に隠された秘密を追うことになる。',
 'らき☆すた':'アニメやゲームが好きな泉こなたと、しっかり者の柊かがみ、おっとりした柊つかさ、博識な高良みゆき。仲良しの4人を中心に、学校生活や趣味の話題を交えた、何気ない日常を描く。',
 'かぐや様は告らせたい -ファーストキッスは終わらない-':'秀知院学園の文化祭で初めてキスを交わしたかぐやと白銀。しかし、はっきりと気持ちを伝えないまま、二人はクリスマスを迎える。互いを強く意識する中、完璧を求める白銀と、ありのままを求めるかぐやの関係が少しずつ動き出す。',
 'あそびあそばせ':'本田華子、オリヴィア、野村香純の三人は「遊び人研究会」を作り、さまざまな遊びに挑戦する。個性も考え方も異なる三人が集まることで、学校生活は思いがけない騒動の連続になっていく。',
 '涼宮ハルヒの消失':'クリスマスが近づく冬の日、いつものように学校へ向かったキョンは、ハルヒが姿を消し、周囲の状況も変わっていることに気づく。さらに、かつて存在しなかったはずの朝倉が現れ、キョンは変わってしまった世界の謎を追う。',
 'さよならの朝に約束の花をかざろう':'長い寿命を持つイオルフの少女マキアは、故郷を襲った戦乱から逃れ、親を失った赤ん坊エリアルと出会う。成長していくエリアルと、姿の変わらないマキアは、異なる時間の流れの中で親子のような絆を育んでいく。',
 'ヴァイオレット・エヴァーガーデン 外伝~永遠と自動手記人形~':'良家の子女が通う女学校で暮らすイザベラ・ヨークは、父との約束によって自分の将来に希望を持てずにいた。教育係として派遣された自動手記人形ヴァイオレットとの交流を通じて、イザベラの心に少しずつ変化が生まれる。',
 '猫物語（黒）':'ゴールデンウィーク初日、阿良々木暦は委員長の羽川翼とともに、車に轢かれた猫を埋葬する。その出来事をきっかけに、羽川家の事情や「障り猫」を巡る異変が明らかになり、暦は九日間の怪異に向き合う。',
 'アクダマドライブ':'カントウとカンサイの戦争後、分断された世界では、政治や警察の力が衰え、犯罪者「アクダマ」が社会に広がっていた。ある依頼をきっかけに集められたアクダマたちは、それぞれ異なる信念を抱え、歪んだ社会を揺るがす事件へ関わっていく。',
 '虚構推理':'幼いころに怪異に連れ去られ、知恵の神となった岩永琴子は、怪異たちから持ち込まれる問題を解決していた。怪異に恐れられる不思議な力を持つ桜川九郎と出会い、二人は人ならざる存在が関わる事件に、推理と物語を組み立てて立ち向かう。',
 'ゼロの使い魔':'魔法の才能がない少女ルイズは、使い魔を召喚する儀式で、異世界から来た高校生・平賀才人を呼び出してしまう。才人は元の世界へ戻る手がかりを探しながら、ルイズの使い魔として魔法学院での生活やさまざまな事件に巻き込まれていく。',
 'クズの本懐':'高校生の安楽岡花火は、叶わない恋心を抱えながら日々を過ごしていた。互いに別の相手を想う花火と粟屋麦は、孤独や寂しさを抱えたまま、複雑な関係と自分の気持ちに向き合っていく。',
 '蜘蛛ですが、なにか？':'目を覚ますと異世界の蜘蛛の魔物に転生していた「私」。危険な魔物が徘徊する迷宮で、人間としての知恵と前向きさを頼りに、次々と現れる脅威を乗り越えながら生き残りを目指す。',
 '学戦都市アスタリスク':'大災害「落星雨」によって生まれた特殊能力者「星脈世代」が暮らす世界。水上学園都市アスタリスクに転入した天霧綾斗は、自らの願いを叶えるため、ユリスと共に学園対抗の大会「星武祭」に挑む。',
 'K':'現実とは少し異なる歴史を歩んだ現代日本。学園で暮らす伊佐那社は、ある日、見知らぬ男たちに追われることになる。やがて彼は、異なる勢力を率いる「王」たちの争いと、自らの正体に関わる大きな事件へ巻き込まれていく。',
 'マギ The kingdom of magic':'迷宮ザガンでの戦いを終えたアラジン、アリババ、モルジアナは、それぞれの目標に向かってシンドリアを離れる。アラジンは魔導士を育成するマグノシュタットの魔法学院へ留学し、新たな仲間や国の抱える問題と向き合う。',
 'ゲーマーズ！':'ゲーム好きの高校生・雨野景太は、学園一の美少女でゲーム部部長の天道花憐から入部を誘われる。個性もゲームへの向き合い方も異なる生徒たちが関わり合ううち、勘違いやすれ違いが重なり、思いがけない騒動が広がっていく。',
 '地獄楽 第二期':'仙薬の手がかりを追う画眉丸たちは、天仙が支配する島の奥地へ進む。幕府から新たな執行人たちも送り込まれ、人間と天仙、そして島に集う者たちの思惑が交錯していく。',
 '〈物語〉シリーズ セカンドシーズン':'怪異に関わる少女たちと阿良々木暦たちの周囲で、新たな出来事が次々と起こる。羽川翼をはじめ、それぞれの登場人物が自分の過去や心の問題と向き合い、物語が交差していく。',
 'デート・ア・ライブⅡ':'精霊の力を封じる能力を持つ五河士道は、新たな精霊たちと出会い、彼女たちを救うために向き合っていく。精霊を巡る組織や勢力の思惑も重なり、士道は再び大きな戦いへ関わる。',
 'ひげを剃る。そして女子高生を拾う。':'仕事帰りの会社員・吉田は、家出して行き場を失った女子高生・沙優と出会う。事情を抱える沙優を放っておけず、二人は同居生活を始めることになる。',
 '傷物語〈Ⅰ鉄血篇〉':'春休みのある夜、阿良々木暦は噂の吸血鬼キスショットと遭遇する。彼女を助けたことをきっかけに眷属となった暦は、元の日常を取り戻すための出来事に巻き込まれていく。',
 '光が死んだ夏':'山あいの集落で育ったよしきと光。ある日、よしきは帰ってきた光に以前とは異なる何かを感じ取る。それでも隣にいることを選んだ二人の日常に、集落を揺るがす異変が起こり始める。',
 '宇崎ちゃんは遊びたい！':'一人で過ごす時間を好む大学生・桜井真一の前に、後輩の宇崎花が現れる。何かと桜井にちょっかいを出す宇崎に振り回されながら、二人はにぎやかな大学生活を送っていく。',
 '精霊幻想記':'前世の記憶を持つ少年リオは、異世界で貧しい境遇から人生を切り開こうとする。魔法の力や新たな出会いを通じて、王族や貴族が関わる事件に巻き込まれながら、自らの運命に立ち向かう。',
 '異世界でチート能力を手にした俺は、現実世界をも無双する ～レベルアップは人生を変えた～':'周囲から孤立していた少年・天上優夜は、偶然見つけた異世界への扉を開き、特別な力を手に入れる。異世界での成長は現実世界にも影響し、優夜の生活を大きく変えていく。',
 '現実主義勇者の王国再建記':'異世界に召喚された相馬一也は、王位を託されたことをきっかけに、現代の知識と合理的な考え方を生かして王国の立て直しに取り組む。仲間と協力しながら、政治や財政の問題に向き合っていく。',
 '転生したらスライムだった件 第4期 第1&2クール':'開国祭を終え、各国との交流を進める魔国連邦テンペスト。人と魔物が共に暮らす世界を目指すリムルたちの前に、その台頭を警戒する勢力が現れ、国の未来を左右する対立が動き始める。',
 '夫婦以上、恋人未満。':'高校生の薬院次郎は、授業の一環で行われる「夫婦実習」で、クラスの渡辺星とペアを組むことになる。それぞれ別の相手に想いを寄せる二人は、ペア交換を目指して本気の夫婦生活を演じ始める。',
 'メイドインアビス 深き魂の黎明':'アビスの深界五層へ進んだリコ、レグ、ナナチは、探窟家ボンドルドの待つ前線基地でプルシュカという少女と出会う。さらなる深層を目指す三人は、アビスに隠された謎と向き合うことになる。',
 'ゴールデンカムイ':'日露戦争を生き抜いた元軍人・杉元佐一は、北海道に隠されたアイヌの莫大な埋蔵金を探し始める。アイヌの少女アシㇼパと出会った杉元は、手掛かりを握る者たちとの生存競争に身を投じていく。',
 '食戟のソーマ 神ノ皿':'薙切薊が総帥となった遠月学園で、創真たちは仲間の退学処分を取り消すため、新たな十傑との連隊食戟に挑む。料理人としての技と仲間との連携を武器に、厳しい勝負を勝ち進んでいく。',
 'PSYCHO-PASS サイコパス2':'犯罪係数によって人々の心理状態が管理される近未来。常守朱たち公安局刑事課一係は、シビュラシステムの判定を揺るがす不可解な事件を追う。捜査が進むにつれ、謎の人物・鹿矛囲の存在が浮かび上がる。',
 'THE LAST -NARUTO THE MOVIE-':'第四次忍界大戦から二年後、木ノ葉隠れの里に月が異常接近する危機が訪れる。ナルトたちは調査に向かうが、謎の男トネリが現れ、ヒナタや世界の運命を巡る事件へと発展していく。',
 '劇場版 シュタインズゲート 負荷領域のデジャヴ':'シュタインズ・ゲート世界線にたどり着いた岡部倫太郎は、世界線を越えた経験の影響で、現実から姿を消し始める。岡部を観測できなくなった牧瀬紅莉栖は、彼を取り戻す方法を探す。',
 '食戟のソーマ 豪ノ皿':'遠月学園の頂点に立った幸平創真たちは、若手料理人が世界一を競う大会「THE BLUE」に招待される。従来とは異なる難題や新たなライバルが待ち受ける中、創真は料理人としてさらなる高みを目指す。',
 'ネトゲの嫁は女の子じゃないと思った?':'オンラインゲームを楽しむ高校生・西村英騎は、ゲーム内で告白してきたアコとオフ会で会うことになる。現実でも同じ学校に通う仲間たちとゲーム部を結成し、ネットと現実の距離感に戸惑いながら交流を深めていく。',
 'ラブ★コン':'大阪の高校に通う小泉リサと大谷敦士は、身長差をからかわれることも多い口げんかの絶えない二人。互いの恋を応援するうちに、友人として過ごしてきた関係に少しずつ変化が生まれていく。',
 '勇者刑に処す 懲罰勇者9004隊刑務記録':'大罪を犯した者に「勇者」として魔王軍と戦う刑罰が科される世界。元聖騎士団長のザイロは懲罰勇者部隊を率いる中で、剣の女神テオリッタと出会い、戦いと陰謀に巻き込まれていく。',
 'Fate/stay night[Heaven\'s Feel] Ⅰ.presage flower':'聖杯を巡る戦いが再び始まった冬木市。衛宮士郎は、日々を共に過ごしてきた間桐桜を守ろうと決意し、セイバーとともに聖杯戦争へ身を投じる。やがて戦いの背後に隠された異変が明らかになっていく。',
 '俺を好きなのはお前だけかよ':'幼なじみのひまわりと生徒会長のコスモスからデートに誘われた高校生・如月雨露。しかし二人の目的は、雨露の親友への恋愛相談だった。思惑が外れた雨露の前に、毒舌な図書委員パンジーも現れ、予想外の人間関係が動き始める。',
 '七つの大罪 憤怒の審判':'激化する聖戦の中で、メリオダスと仲間たちは魔神王の復活を阻止し、エリザベスにかけられた呪いを解くため最後の戦いへ向かう。長く続いた因縁の行方が描かれる。',
 'スライム倒して300年、知らないうちにレベルMAXになってました':'過労の末に命を落とした会社員は、異世界で不老不死の魔女アズサに転生する。スライムを倒して暮らす日々を300年続けるうちに世界最強となり、仲間たちとのにぎやかな生活が始まる。',
 '魔王学院の不適合者 ～史上最強の魔王の始祖、転生して子孫たちの学校へ通う～ Ⅱ':'人と魔族の争いを止めたアノスの前に、新たな教師と神の子を巡る謎が現れる。失われた記憶と世界の過去に隠された真実を追いながら、アノスは再び大きな戦いへ向かう。',
 'はじめの一歩 THE FIGHTING!':'いじめられっ子だった高校生・幕之内一歩は、プロボクサーの鷹村守との出会いをきっかけにボクシングを始める。鴨川ジムで練習を重ね、強さとは何かを求めてリングに挑んでいく。',
 '私がモテないのはどう考えてもお前らが悪い!':'高校生になれば自然と人気者になれると思っていた黒木智子。しかし現実は思い描いていたものとは違い、クラスメイトともなかなか打ち解けられない。自分を変えようと奮闘する智子の高校生活を描くコメディ。',
 'メガロボクス':'肉体とギアを組み合わせた格闘技「メガロボクス」が人気を集める時代。未認可地区で試合を続けるジャンクドッグは、チャンピオンの勇利との出会いをきっかけに、自分の現在を変えるため大舞台へ挑む。',
 '弱キャラ友崎くん':'対戦ゲームで高い実力を持ちながら、現実の人間関係を苦手とする高校生・友崎文也。学園の人気者である日南葵から課題を与えられ、仲間との交流やさまざまな経験を通じて自分を変えようとする。',
 'ゆびさきと恋々':'生まれつき聴覚に障がいのある大学生・雪は、困っていたところを先輩の逸臣に助けられる。自分の世界を広げてくれる彼との出会いをきっかけに、雪は新しい人や文化との交流を重ねていく。',
}).map(([title,summary])=>[normalizeAnswer(title),summary]));
function descriptionOf(a){
 if(lang==='ja'){
  const titles=[a?.title?.native,a?.title?.english,a?.title?.romaji,...(Array.isArray(a?.synonyms)?a.synonyms:[]),...titleAnswerVariants(a)];
  for(const title of titles){const summary=JAPANESE_SYNOPSIS_OVERRIDES.get(normalizeAnswer(title));if(summary)return summary}
 }
 return (a?.description||'').replace(/<[^>]*>/g,' ').replace(/\[[^\]]*\]\([^)]*\)/g,' ').replace(/\\[nrt]/gi,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim()
}
function hasJapanese(text){return /[ぁ-んァ-ヶ]/.test(String(text||''))}
function titleUsable(a){return lang!=='ja'||!!titleOf(a)}
let personalDifficultyProfile={attempts:0,runs:0,correctRate:null};
let adaptiveDifficultyOverride=null;
function difficultyModes(){return adaptiveDifficultyOverride||$('#difficultySelect')?.value||'normal'}
function calculatePersonalDifficultyOverride(){
 const levels=['veryEasy','easy','normal','hard','veryHard'];
 const base=$('#difficultySelect')?.value||'normal',baseIndex=Math.max(0,levels.indexOf(base));
 if(personalDifficultyProfile.attempts<20||personalDifficultyProfile.runs<3||!Number.isFinite(personalDifficultyProfile.correctRate))return null;
 const adjustment=personalDifficultyProfile.correctRate>=.85?1:personalDifficultyProfile.correctRate<=.45?-1:0;
 return levels[Math.max(0,Math.min(levels.length-1,baseIndex+adjustment))]===base?null:levels[Math.max(0,Math.min(levels.length-1,baseIndex+adjustment))];
}
let difficultyRarityById=new Map(),difficultyStudioCounts=new Map(),difficultyYearCounts=new Map(),difficultyMaxStudioCount=1,difficultyMaxYearCount=1,empiricalDifficultyStats=new Map(),difficultyStatsRevision=0;
let difficultyThresholds={total:0},difficultyTierPreparedPool=null,difficultyTierPreparedLength=-1;
window.addEventListener('aqw:personal-difficulty-profile',event=>{
 const profile=event.detail||{};
 personalDifficultyProfile={
  attempts:Math.max(0,Number(profile.attempts)||0),
  runs:Math.max(0,Number(profile.runs)||0),
  correctRate:Number.isFinite(Number(profile.correctRate))?Number(profile.correctRate):null
 };
 updateDifficultyUI();
});
window.addEventListener('aqw:question-difficulty-stats',event=>{
 const records=Array.isArray(event.detail)?event.detail:[];
 const next=new Map();
 for(const record of records){
  const animeId=Number(record?.animeId),mode=String(record?.questionMode||''),attempts=Number(record?.attempts),uniquePlayers=Number(record?.uniquePlayers),effectiveAnswers=Number(record?.effectiveAnswers),correctRate=Number(record?.correctRate);
  if(Number.isSafeInteger(animeId)&&animeId>0&&attempts>=50&&effectiveAnswers>=30&&uniquePlayers>=30&&correctRate>=0&&correctRate<=1&&Number.isFinite(correctRate)&&Number.isFinite(effectiveAnswers))next.set(animeId+'|'+mode,{attempts,uniquePlayers,effectiveAnswers,correctRate});
 }
 empiricalDifficultyStats=next;difficultyStatsRevision++;
 if(pool.length)prepareDifficultyTiers(pool);
 updateDifficultyUI();
});
function prepareDifficultyTiers(items=pool){
 if(items===difficultyTierPreparedPool&&items.length===difficultyTierPreparedLength&&difficultyThresholds.total)return difficultyThresholds;
 difficultyTierPreparedPool=items;difficultyTierPreparedLength=items.length;
 const ranked=(items||[]).filter(a=>Number.isFinite(Number(a?.id))&&Number.isFinite(Number(a?.popularity))&&Number(a.popularity)>0).sort((a,b)=>Number(b.popularity)-Number(a.popularity)||Number(a.id)-Number(b.id));
 const total=ranked.length,rarity=new Map();
 ranked.forEach((a,i)=>rarity.set(Number(a.id),total<=1?50:(i/(total-1))*100));
 difficultyRarityById=rarity;
 difficultyStudioCounts=new Map();difficultyYearCounts=new Map();
 for(const anime of items||[]){
  const studios=[...new Set((anime?.studios?.nodes||[]).map(node=>String(node?.name||'').trim()).filter(Boolean))];
  for(const studio of studios)difficultyStudioCounts.set(studio,(difficultyStudioCounts.get(studio)||0)+1);
  const year=animeYear(anime);if(Number.isInteger(year))difficultyYearCounts.set(year,(difficultyYearCounts.get(year)||0)+1);
 }
 difficultyMaxStudioCount=1;for(const count of difficultyStudioCounts.values())if(count>difficultyMaxStudioCount)difficultyMaxStudioCount=count;
 difficultyMaxYearCount=1;for(const count of difficultyYearCounts.values())if(count>difficultyMaxYearCount)difficultyMaxYearCount=count;
 difficultyThresholds={total};
 return difficultyThresholds;
}
function clampDifficultyScore(value){return Math.max(0,Math.min(100,Number(value)||0))}
function difficultyModesForAnime(a){
 // Mixed-mode difficulty must use exactly the same eligible modes as question generation.
 return availableQuestionModes(a,$('#answerFormatSelect')?.value||'choices');
}
function questionModeDifficultyScore(a,mode){
 const base={image:12,studio:38,year:34,synonym:42,titleStudio:42,titleYear:36,titleSynopsis:66,synopsis:62,titleEpisodes:32,titleGenre:48,titleFormat:28};
 let score=base[mode]??50;
 if(mode==='titleStudio'){
  const studios=[...new Set((a?.studios?.nodes||[]).map(node=>String(node?.name||'').trim()).filter(Boolean))];
  if(studios.length){const rarity=studios.reduce((sum,name)=>sum+100*(1-(difficultyStudioCounts.get(name)||0)/difficultyMaxStudioCount),0)/studios.length;score=score*.7+rarity*.3}
 }
 if(mode==='titleYear'){
  const count=difficultyYearCounts.get(animeYear(a))||0;
  score=score*.7+(100*(1-count/difficultyMaxYearCount))*.3;
 }
 if(['character','titleCharacter','characterImage','characterNameImage'].includes(mode)){
  const count=Math.max(1,characterNames(a).length);
  score+=Math.max(0,5-count)*2.5;
 }
 if(mode==='synopsis'){
  const length=descriptionOf(a).length;
  if(length<90)score+=8;else if(length>220)score-=6;
 }
 if(mode==='synonym'){
  const count=uniqueAliasCandidates(a).length;
  if(count<=1)score+=6;else if(count>=5)score-=4;
 }
 return clampDifficultyScore(score);
}
function wilsonHalfWidth(correctRate,effectiveAnswers){
 const n=Math.max(1,Number(effectiveAnswers)||0),p=Math.max(0,Math.min(1,Number(correctRate)||0)),z=1.96,z2=z*z;
 const denominator=1+z2/n;
 return z*Math.sqrt((p*(1-p)/n)+(z2/(4*n*n)))/denominator;
}
function difficultyInitialWeight(effectiveAnswers,correctRate){
 const n=Math.max(0,Number(effectiveAnswers)||0);
 if(n<30)return 1;
 const p=Math.max(0,Math.min(1,Number(correctRate)||0));
 const startWidth=wilsonHalfWidth(p,30);
 const targetWidth=wilsonHalfWidth(p,100);
 const currentWidth=wilsonHalfWidth(p,n);
 const progress=Math.max(0,Math.min(1,(startWidth-currentWidth)/(startWidth-targetWidth)));
 return Math.max(0,Math.min(1,(1+Math.cos(Math.PI*progress))/2));
}
function difficultyScoreForMode(a,mode,workRarity){
 const heuristic=questionModeDifficultyScore(a,mode);
 const initial=clampDifficultyScore(workRarity*.60+heuristic*.40);
 const stats=empiricalDifficultyStats.get(Number(a?.id)+'|'+mode);
 if(stats&&stats.attempts>=50&&stats.uniquePlayers>=30&&stats.effectiveAnswers>=30&&Number.isFinite(stats.correctRate)){
  const empirical=clampDifficultyScore((1-stats.correctRate)*100);
  const initialWeight=difficultyInitialWeight(stats.effectiveAnswers,stats.correctRate);
  return clampDifficultyScore(initial*initialWeight+empirical*(1-initialWeight));
 }
 return initial;
}
function popularityTier(a,requestedMode){
 const id=Number(a?.id),workRarity=difficultyRarityById.has(id)?difficultyRarityById.get(id):50;
 const selectedMode=requestedMode||$('#modeSelect')?.value||'mixed';
 let finalScore;
 if(selectedMode!=='mixed')finalScore=difficultyScoreForMode(a,selectedMode,workRarity);
 else{
  const modes=difficultyModesForAnime(a);
  finalScore=modes.length?modes.reduce((sum,mode)=>sum+difficultyScoreForMode(a,mode,workRarity),0)/modes.length:clampDifficultyScore(workRarity*.5+25);
 }
 return finalScore<=20?'veryEasy':finalScore<=40?'easy':finalScore<=60?'normal':finalScore<=80?'hard':'veryHard';
}
function matchesDifficulty(a,format,mode){return popularityTier(a,mode)===difficultyModes()}
function animeHasMode(a,mode,format){if(format==='typed'&&!typedTitleEligible(a))return false;if(['image','synonym','titleYear','titleStudio','synopsis','character','characterImage'].includes(mode)&&!titleUsable(a))return false;if(mode==='image')return titleImageIsSafe(a)&&titleUsable(a);if(mode==='studio')return false;if(mode==='titleStudio')return !!a.studios?.nodes?.[0]?.name;if(mode==='character'||mode==='titleCharacter')return characterNames(a).length>0;if(mode==='characterImage'||mode==='characterNameImage')return characterRecords([a]).length>0&&characterRecords(pool.filter(item=>Number(item.id)!==Number(a.id)&&matchesDifficulty(item,format,mode)&&titleUsable(item))).length>=3;if(mode==='synonym')return uniqueAliasCandidates(a).length>0;if(mode==='year')return false;if(mode==='titleYear')return Number.isInteger(animeYear(a))&&animeYear(a)>1900&&(format==='typed'||yearChoiceRecordsForAnime(a).length>=4);if(mode==='synopsis')return hasUsableSynopsis(a)&&titleUsable(a);return false}
function difficultyDistractors(excludeId){return pool.filter(item=>Number(item?.id)!==Number(excludeId)&&titleUsable(item))}
function updateDifficultyUI(){
 const select=$('#difficultySelect'),label=$('#difficultyLabel'),help=$('#difficultyHelp');if(!select||!label)return;
 const translations={
 ja:{label:'難易度',veryEasy:'とても簡単',easy:'簡単',normal:'ふつう',hard:'難しい',veryHard:'とても難しい',formula:'作品の知名度（60%）と問題形式（40%）を基準にスコアを算出。',desc:{veryEasy:'0〜20点。',easy:'同じ基準で21〜40点。',normal:'同じ基準で41〜60点。',hard:'同じ基準で61〜80点。',veryHard:'同じ基準で81〜100点。',disabled:'作品の知名度と問題形式を組み合わせて判定します。'}},
 en:{label:'Difficulty',veryEasy:'Very easy',easy:'Easy',normal:'Normal',hard:'Hard',veryHard:'Very hard',formula:'Difficulty score: 60% anime familiarity and 40% question format.',desc:{veryEasy:'0–20.',easy:'Same criteria: 21–40.',normal:'Same criteria: 41–60.',hard:'Same criteria: 61–80.',veryHard:'Same criteria: 81–100.',disabled:'Combines catalogue popularity and question format.'}},
 ko:{label:'난이도',veryEasy:'매우 쉬움',easy:'쉬움',normal:'보통',hard:'어려움',veryHard:'매우 어려움',formula:'작품 인지도 60%, 문제 유형 40%를 반영해 점수를 계산합니다.',desc:{veryEasy:'0~20점.',easy:'같은 기준으로 21~40점.',normal:'같은 기준으로 41~60점.',hard:'같은 기준으로 61~80점.',veryHard:'같은 기준으로 81~100점.',disabled:'작품 인지도와 문제 유형을 함께 평가합니다.'}},
 zh:{label:'难度',veryEasy:'非常简单',easy:'简单',normal:'普通',hard:'困难',veryHard:'非常困难',formula:'难度分数由作品知名度（60%）和题型难度（40%）计算。',desc:{veryEasy:'0–20分。',easy:'按相同标准评为21–40分。',normal:'按相同标准评为41–60分。',hard:'按相同标准评为61–80分。',veryHard:'按相同标准评为81–100分。',disabled:'综合作品知名度与题型难度。'}},
 es:{label:'Dificultad',veryEasy:'Muy fácil',easy:'Fácil',normal:'Normal',hard:'Difícil',veryHard:'Muy difícil',formula:'La popularidad del anime aporta el 60% y el formato de pregunta el 40%.',desc:{veryEasy:'0–20.',easy:'Mismos criterios: 21–40.',normal:'Mismos criterios: 41–60.',hard:'Mismos criterios: 61–80.',veryHard:'Mismos criterios: 81–100.',disabled:'Combina popularidad y complejidad del formato.'}},
 fr:{label:'Difficulté',veryEasy:'Très facile',easy:'Facile',normal:'Normale',hard:'Difficile',veryHard:'Très difficile',formula:'La notoriété de l’anime compte pour 60 % et le format de question pour 40 %.',desc:{veryEasy:'0–20.',easy:'Mêmes critères : 21–40.',normal:'Mêmes critères : 41–60.',hard:'Mêmes critères : 61–80.',veryHard:'Mêmes critères : 81–100.',disabled:'Combine notoriété et difficulté du format.'}},
 pt:{label:'Dificuldade',veryEasy:'Muito fácil',easy:'Fácil',normal:'Normal',hard:'Difícil',veryHard:'Muito difícil',formula:'A popularidade do anime representa 60% e a dificuldade do formato 40%.',desc:{veryEasy:'0–20.',easy:'Mesmos critérios: 21–40.',normal:'Mesmos critérios: 41–60.',hard:'Mesmos critérios: 61–80.',veryHard:'Mesmos critérios: 81–100.',disabled:'Combina popularidade e dificuldade do formato.'}},
 de:{label:'Schwierigkeit',veryEasy:'Sehr einfach',easy:'Einfach',normal:'Normal',hard:'Schwer',veryHard:'Sehr schwer',formula:'Die Bekanntheit des Anime zählt 60 %, die Schwierigkeit des Formats 40 %.',desc:{veryEasy:'0–20.',easy:'Gleiche Kriterien: 21–40.',normal:'Gleiche Kriterien: 41–60.',hard:'Gleiche Kriterien: 61–80.',veryHard:'Gleiche Kriterien: 81–100.',disabled:'Kombiniert Bekanntheit und Format-Schwierigkeit.'}}
 };
 const names=translations[lang]||translations.en;
 label.textContent=names.label;[...select.options].forEach(o=>o.textContent=names[o.value]||o.textContent);
 select.disabled=false;select.title='';
 if(help){
  const base=names.desc[select.value]||names.desc.normal;
  const count=difficultyThresholds.total?(' '+(lang==='ja'?'評価対象：':'Evaluated anime: ')+difficultyThresholds.total.toLocaleString()):'';
  const feedback=lang==='ja'?' 全体の回答データは、回答50回以上・30人以上・有効回答数30以上の問題で実測正答率を反映します。':' Observed accuracy is used when a question has at least 50 answers, 30 players, and 30 effective answers.';
  let personal='';
  if(personalDifficultyProfile.attempts>=20&&personalDifficultyProfile.runs>=3&&Number.isFinite(personalDifficultyProfile.correctRate)){
   const rate=Math.round(personalDifficultyProfile.correctRate*100),nextTier=calculatePersonalDifficultyOverride();
   personal=lang==='ja'?' あなたの直近'+personalDifficultyProfile.attempts+'問の正答率：'+rate+'%。':' Your recent accuracy: '+rate+'% across '+personalDifficultyProfile.attempts+' answers.';
   if(nextTier){const nextLabel=names[nextTier]||nextTier;personal+=lang==='ja'?' 次回は「'+nextLabel+'」に自動調整します。':' Next quiz adjusts to '+nextLabel+'.'}
   else{personal+=lang==='ja'?' 次回は現在の設定を維持します。':' Your selected level will be maintained next quiz.'}
  }else{
   personal=lang==='ja'?' 個人適応には20問以上・3回以上のプレイ記録が必要です。':' Personal adaptation requires at least 20 answers across 3 runs.';
  }
  help.textContent=(names.formula?names.formula+' ':'')+base+count+feedback+personal;
 }
}
function updateQuestionCountUI(){
 const preset=$('#questionCountPreset'),input=$('#questionCount'),help=$('#questionCountHelp'),mode=$('#playMode')?.value||'normal';
 if(!preset||!input||!help)return;
 const fixed=mode==='daily'||mode==='rush'||mode==='endless';
 preset.disabled=fixed;input.disabled=fixed;
 const messages={
  ja:mode==='endless'?'エンドレスは出題できる問題を続けて出題します。':mode==='daily'||mode==='rush'?'このプレイ形式は10問固定です。':'1〜10,000問を指定できます。条件に合う問題が少ない場合は、出題可能な数まで自動調整します。',
  en:mode==='endless'?'Endless mode continues until no more eligible questions remain.':mode==='daily'||mode==='rush'?'This play mode uses a fixed set of 10 questions.':'Choose 1–10,000 questions. If fewer are available, the quiz uses the available number.',
  ko:mode==='endless'?'무한 모드는 출제 가능한 문제가 남아 있는 동안 계속됩니다.':mode==='daily'||mode==='rush'?'이 플레이 모드는 10문제로 고정됩니다.':'1~10,000문제를 선택할 수 있습니다. 가능한 문제가 적으면 출제 가능한 수로 조정됩니다.',
  zh:mode==='endless'?'无尽模式会持续出题，直到没有可用题目。':mode==='daily'||mode==='rush'?'此模式固定为10题。':'可选择1至10,000题。若可用题目较少，将自动调整为可出题数量。',
  es:mode==='endless'?'El modo infinito continúa mientras haya preguntas disponibles.':mode==='daily'||mode==='rush'?'Este modo tiene 10 preguntas fijas.':'Elige entre 1 y 10.000 preguntas. Si hay menos disponibles, se ajustará la cantidad.',
  fr:mode==='endless'?'Le mode sans fin continue tant que des questions sont disponibles.':mode==='daily'||mode==='rush'?'Ce mode comporte 10 questions fixes.':'Choisissez de 1 à 10 000 questions. Si moins sont disponibles, le nombre sera ajusté.',
  pt:mode==='endless'?'O modo infinito continua enquanto houver perguntas disponíveis.':mode==='daily'||mode==='rush'?'Este modo tem 10 perguntas fixas.':'Escolha de 1 a 10.000 perguntas. Se houver menos disponíveis, a quantidade será ajustada.',
  de:mode==='endless'?'Der Endlosmodus läuft, solange Fragen verfügbar sind.':mode==='daily'||mode==='rush'?'Dieser Modus umfasst fest 10 Fragen.':'Wähle 1 bis 10.000 Fragen. Sind weniger verfügbar, wird die Anzahl angepasst.'
 };
 help.textContent=messages[lang]||messages.en;
}
$('#difficultySelect')?.addEventListener('change',updateDifficultyUI);
$('#playMode')?.addEventListener('change',updateQuestionCountUI);
$('#questionCount')?.addEventListener('change',()=>{const input=$('#questionCount');const value=Number(input.value);input.value=String(Number.isFinite(value)?Math.min(10000,Math.max(1,Math.floor(value))):10);const preset=$('#questionCountPreset');if(preset)preset.value=['5','10','20','50','100','200','500','1000','5000','10000'].includes(input.value)?input.value:'custom'});
updateQuestionCountUI();
function synopsisText(a){const s=descriptionOf(a);return s.length>260?s.slice(0,257).trimEnd()+'…':s}
function hasUsableSynopsis(a){
 const s=descriptionOf(a);
 if(s.length<45||/^(no synopsis|no description|not available|tba|unknown|未定|あらすじなし|情報なし)\.?$/i.test(s.trim()))return false;
 if(lang==='ja'){
  // Japanese quizzes use Japanese-authored synopsis text only; do not show English
  // descriptions in Japanese mode or translate them mechanically at display time.
  const kana=(s.match(/[ぁ-んァ-ヶ]/g)||[]).length;
  const latin=(s.match(/[A-Za-z]/g)||[]).length;
  return kana>=10&&kana/s.length>=0.08&&latin/s.length<0.25;
 }
 if(lang==='ko'){const ko=(s.match(/[가-힣]/g)||[]).length;return ko>=10&&ko/s.length>=0.12}
 if(lang==='zh'){const zh=(s.match(/[\u3400-\u9fff]/g)||[]).length;return zh>=10&&zh/s.length>=0.16}
 if(lang==='en'){const latin=(s.match(/[A-Za-z]/g)||[]).length;const jp=(s.match(/[ぁ-んァ-ヶ]/g)||[]).length;return latin>=30&&jp/s.length<0.08}
 return s.length>=45
}
function characterDisplayName(character){const name=character?.name||{};const preferred=lang==='ja'?name.native:(name.full||name.native);return String(preferred||name.full||name.native||'').trim()}function characterNames(a){return [...new Set((a.characters?.nodes||[]).map(characterDisplayName).filter(Boolean))]}function isSingleAnimeCharacter(record,summary=questionChoiceSummary()){const key=normalizeAnswer(record?.name);return !!key&&summary.uniqueCharacterNameKeys.has(key)&&summary.characterNameAnimeCounts.get(key)===1}
function characterRecords(items=pool){const records=new Map();for(const anime of items||[])for(const character of anime?.characters?.nodes||[]){const name=characterDisplayName(character),image=character?.image?.large||'',id=Number(character?.id)||0,animeId=Number(anime.id)||0;if(!name||!hasUsableImageUrl(image))continue;const key=id?'id:'+id:'name:'+normalizeAnswer(name)+'|'+image;if(!records.has(key))records.set(key,{id,name,image,animeId,animeIds:new Set(animeId?[animeId]:[])});else if(animeId)records.get(key).animeIds.add(animeId)}return [...records.values()]}
// Sample distractors across the entire character catalogue instead of taking the first entries.
// The old pool-order selection repeatedly chose the same early popular series (notably Attack on Titan).
function characterDistractors(animeId,seenNames=new Set(),imageAnswers=false,excludeImage=''){
 const targetId=Number(animeId)||0,records=questionChoiceSummary().uniqueCharacterRecords;
 if(!records.length)return [];
 const selected=[],seen=new Set(seenNames),seenImages=new Set(imageAnswers&&excludeImage?[String(excludeImage)]:[]);
 const add=record=>{
  if(!record||record.animeIds?.has(targetId)||Number(record.animeId)===targetId)return;
  const key=normalizeAnswer(record.name),image=String(record.image||'');
  if(!key||seen.has(key)||(imageAnswers&&(!image||seenImages.has(image))))return;
  seen.add(key);if(imageAnswers)seenImages.add(image);selected.push(record);
 };
 const attempts=Math.min(records.length,48),visited=new Set();
 for(let i=0;i<attempts&&selected.length<3;i++){
  const index=randomInt(records.length);if(visited.has(index))continue;visited.add(index);add(records[index]);
 }
 if(selected.length<3){const start=randomInt(records.length);for(let i=0;i<records.length&&selected.length<3;i++)add(records[(start+i)%records.length]);}
 return selected;
}
function characterChoiceRecordsForAnime(anime,correctRecord,imageAnswers=false){
 const correctKey=normalizeAnswer(correctRecord?.name),uniqueNames=questionChoiceSummary().uniqueCharacterNameKeys,seen=new Set([correctKey]),records=[];
 if(!anime||!correctKey||!uniqueNames.has(correctKey)||imageAnswers&&!correctRecord?.image)return records;
 records.push({label:correctRecord.name,value:correctRecord.name,image:imageAnswers?correctRecord.image:''});
 for(const item of characterDistractors(anime.id,seen,imageAnswers,correctRecord?.image)){
  const key=normalizeAnswer(item.name);if(!key||seen.has(key))continue;seen.add(key);records.push({label:item.name,value:item.name,image:imageAnswers?item.image:''});if(records.length===4)break;
 }
 return records;
}
function titleCharacterChoiceRecordsForAnime(anime,correctRecord){
 const correctKey=normalizeAnswer(correctRecord?.name),seen=new Set([correctKey]),records=[];
 if(!anime||!correctKey||!questionChoiceSummary().uniqueCharacterNameKeys.has(correctKey))return records;
 records.push({label:correctRecord.name,value:correctRecord.name});
 for(const item of characterDistractors(anime.id,seen,false)){
  const key=normalizeAnswer(item.name);if(key&&!seen.has(key)){seen.add(key);records.push({label:item.name,value:item.name});if(records.length===4)break;}
 }
 return records;
}function characterChoiceOptions(correctRecord,imageAnswers){const anime=pool.find(item=>Number(item.id)===Number(correctRecord?.animeId));return shuffle(characterChoiceRecordsForAnime(anime,correctRecord,imageAnswers))}
function typedTitleMaxLength(){return ({ja:25,en:60,ko:30,zh:20,es:60,fr:60,pt:60,de:60}[lang]||60)}function typedTitleEligible(a){return [...String(titleOf(a)||'').trim()].length<=typedTitleMaxLength()}
let questionChoiceSummaryCache=null;
function questionChoiceSummary(){
 const key=lang+'|'+pool.length+'|'+(pool[0]?.id||'');
 if(questionChoiceSummaryCache?.key===key&&questionChoiceSummaryCache.pool===pool)return questionChoiceSummaryCache.value;
 const tierPool=pool.filter(item=>titleUsable(item));
 const titleKeys=new Set(tierPool.map(item=>normalizeAnswer(titleOf(item))).filter(Boolean));
 const titleChoiceRecords=new Map(),titleAliasOwners=new Map(),aliasAnimeOwners=new Map();
 const tierStudioKeys=new Set(tierPool.flatMap(item=>item.studios?.nodes?.map(node=>node.name)||[]).map(normalizeAnswer).filter(Boolean));
 const yearKeys=new Set(tierPool.map(animeYear).filter(year=>Number.isInteger(year)&&year>1900).map(String));
 const episodeKeys=new Set(tierPool.map(item=>Number(item?.episodes)).filter(value=>Number.isInteger(value)&&value>0).map(String));
 const formatKeys=new Set(tierPool.map(item=>String(item?.format||'').trim()).filter(Boolean));
 const genreKeys=new Set(tierPool.flatMap(item=>Array.isArray(item?.genres)?item.genres:[]).map(value=>String(value||'').trim()).filter(Boolean));
 const synopsisKeys=new Set();
 for(const item of tierPool){
  const primaryKey=normalizeAnswer(titleOf(item));
  if(primaryKey){
   const aliasKeys=new Set([...titleAnswerVariants(item),...aliasCandidates(item)].map(normalizeAnswer).filter(Boolean));
   aliasKeys.add(primaryKey);
   if(!titleChoiceRecords.has(primaryKey))titleChoiceRecords.set(primaryKey,{id:Number(item.id),aliasKeys});
   for(const alias of aliasKeys){
    if(!titleAliasOwners.has(alias))titleAliasOwners.set(alias,new Set());
    titleAliasOwners.get(alias).add(primaryKey);
    if(!aliasAnimeOwners.has(alias))aliasAnimeOwners.set(alias,new Set());
    aliasAnimeOwners.get(alias).add(Number(item.id));
   }
  }
  if(hasUsableSynopsis(item)){
   const key=normalizeAnswer(synopsisText(item));
   if(key)synopsisKeys.add(key);
  }
 }
 // Legacy character helpers remain harmlessly empty; the active quiz menu
 // uses only synopsis, title-year, alias and title-studio questions.
 const value={
  titleKeys,titleChoiceRecords,titleAliasOwners,aliasAnimeOwners,
  tierStudioKeys,studioKeys:tierStudioKeys,yearKeys,episodeKeys,formatKeys,genreKeys,
  characterNameKeys:new Set(),characterNamesByAnime:new Map(),
  characterNameAnimeCounts:new Map(),characterNameCounts:new Map(),
  uniqueCharacterNameKeys:new Set(),uniqueCharacterRecords:[],
  synopsisCandidates:tierPool.filter(hasUsableSynopsis),synopsisKeys
 };
 questionChoiceSummaryCache={key,pool,value};
 return value;
}

// Build the shared choice index in bounded chunks so a large catalogue cannot
// monopolize the main thread while the page is opening or a quiz is starting.
let questionChoiceSummaryBuild=null;
async function ensureQuestionChoiceSummaryAsync(){
 const sourcePool=pool,key=lang+'|'+sourcePool.length+'|'+(sourcePool[0]?.id||'');
 if(questionChoiceSummaryCache?.key===key&&questionChoiceSummaryCache.pool===sourcePool)return questionChoiceSummaryCache.value;
 if(questionChoiceSummaryBuild?.key===key&&questionChoiceSummaryBuild.pool===sourcePool)return questionChoiceSummaryBuild.promise;
 const build=(async()=>{
  const tierPool=sourcePool.filter(item=>titleUsable(item));
  const titleKeys=new Set(tierPool.map(item=>normalizeAnswer(titleOf(item))).filter(Boolean));
  const titleChoiceRecords=new Map(),titleAliasOwners=new Map(),aliasAnimeOwners=new Map();
  const tierStudioKeys=new Set(),yearKeys=new Set(),episodeKeys=new Set(),formatKeys=new Set(),genreKeys=new Set(),synopsisKeys=new Set(),synopsisCandidates=[];
  for(let i=0;i<tierPool.length;i++){
   const item=tierPool[i],primaryKey=normalizeAnswer(titleOf(item));
   if(primaryKey){
    const aliasKeys=new Set([...titleAnswerVariants(item),...aliasCandidates(item)].map(normalizeAnswer).filter(Boolean));
    aliasKeys.add(primaryKey);
    if(!titleChoiceRecords.has(primaryKey))titleChoiceRecords.set(primaryKey,{id:Number(item.id),aliasKeys});
    for(const alias of aliasKeys){
     if(!titleAliasOwners.has(alias))titleAliasOwners.set(alias,new Set());
     titleAliasOwners.get(alias).add(primaryKey);
     if(!aliasAnimeOwners.has(alias))aliasAnimeOwners.set(alias,new Set());
     aliasAnimeOwners.get(alias).add(Number(item.id));
    }
   }
   for(const node of item?.studios?.nodes||[]){
    const name=String(node?.name||'').trim(),studioKey=normalizeAnswer(name);
    if(studioKey)tierStudioKeys.add(studioKey);
   }
   const year=animeYear(item);
   if(Number.isInteger(year)&&year>1900)yearKeys.add(String(year));
   const episodes=Number(item?.episodes);if(Number.isInteger(episodes)&&episodes>0)episodeKeys.add(String(episodes));
   const format=String(item?.format||'').trim();if(format)formatKeys.add(format);
   for(const genre of Array.isArray(item?.genres)?item.genres:[]){const value=String(genre||'').trim();if(value)genreKeys.add(value)}
   if(hasUsableSynopsis(item)){
    const synopsisKey=normalizeAnswer(synopsisText(item));
    if(synopsisKey)synopsisKeys.add(synopsisKey);
    synopsisCandidates.push(item);
   }
   if((i+1)%64===0&&i+1<tierPool.length)await new Promise(resolve=>setTimeout(resolve,0));
  }
  const value={
   titleKeys,titleChoiceRecords,titleAliasOwners,aliasAnimeOwners,
   tierStudioKeys,studioKeys:tierStudioKeys,yearKeys,episodeKeys,formatKeys,genreKeys,
   characterNameKeys:new Set(),characterNamesByAnime:new Map(),
   characterNameAnimeCounts:new Map(),characterNameCounts:new Map(),
   uniqueCharacterNameKeys:new Set(),uniqueCharacterRecords:[],
   synopsisCandidates,synopsisKeys
  };
  if(pool===sourcePool)questionChoiceSummaryCache={key,pool:sourcePool,value};
  return value;
 })();
 const record={pool:sourcePool,key,promise:build};questionChoiceSummaryBuild=record;
 try{return await build}
 finally{if(questionChoiceSummaryBuild===record)questionChoiceSummaryBuild=null}
}
let restartQuestionSummaryPrewarmToken=0;
function prewarmQuestionSummaryForRestart(){
 const token=++restartQuestionSummaryPrewarmToken;
 const run=async()=>{
  if(token!==restartQuestionSummaryPrewarmToken||!quizFinished||!pool.length)return;
  if(['image','titleStudio'].includes($('#modeSelect')?.value))return;
  const sourcePool=pool;
  try{await ensureQuestionChoiceSummaryAsync()}
  catch(error){console.warn('Restart question index prewarm deferred:',error);return}
  if(token!==restartQuestionSummaryPrewarmToken||!quizFinished)return;
  // A catalogue refresh can replace the pool while the index is being built.
  // A newer refresh schedules another run for the latest pool.
  if(pool!==sourcePool||questionChoiceSummaryCache?.pool!==pool)return;
 };
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:500});
 else setTimeout(run,0);
}
function uniqueCharacterRecordsForAnime(anime,summary=questionChoiceSummary()){return characterRecords([anime]).filter(record=>summary.uniqueCharacterNameKeys.has(normalizeAnswer(record.name)))}
function characterRecordsWithFourChoicesForAnime(anime,summary=questionChoiceSummary(),imageAnswers=false){return uniqueCharacterRecordsForAnime(anime,summary).filter(record=>characterChoiceRecordsForAnime(anime,record,imageAnswers).length===4)}
function characterRecordsWithFourTitleChoicesForAnime(anime,summary=questionChoiceSummary()){return uniqueCharacterRecordsForAnime(anime,summary).filter(record=>titleCharacterChoiceRecordsForAnime(anime,record).length===4)}
function hasFourDistinctTitleChoices(anime,summary=questionChoiceSummary()){return titleChoiceRecordsForAnime(anime).length>=4}
function studioChoiceRecordsForAnime(a){const ownStudios=[...new Set((a?.studios?.nodes||[]).map(node=>String(node?.name||'').trim()).filter(Boolean))],correct=ownStudios[0];if(!correct)return [];const seen=new Set(ownStudios.map(normalizeAnswer).filter(Boolean)),distractors=[],start=pool.length?randomInt(pool.length):0;for(let offset=0;offset<pool.length&&distractors.length<3;offset++){const item=pool[(start+offset)%pool.length];if(Number(item?.id)===Number(a?.id))continue;for(const node of item?.studios?.nodes||[]){const name=String(node?.name||'').trim(),key=normalizeAnswer(name);if(name&&key&&!seen.has(key)){seen.add(key);distractors.push({label:name,value:name});if(distractors.length>=3)break}}}return [{label:correct,value:correct},...distractors]}function hasFourDistinctStudioChoices(a){return studioChoiceRecordsForAnime(a).length>=4}function makeStudioOptions(a){const records=studioChoiceRecordsForAnime(a);return records.length?[records[0],...shuffle(records.slice(1)).slice(0,3)]:[]}
function yearChoiceRecordsForAnime(a){const correct=animeYear(a);if(!Number.isInteger(correct)||correct<=1900)return [];const correctKey=String(correct),records=[{label:correctKey,value:correctKey}];for(const year of questionChoiceSummary().yearKeys){const value=String(year);if(value===correctKey)continue;records.push({label:value,value});if(records.length>=4)break}return records}function makeYearOptions(a){const records=yearChoiceRecordsForAnime(a),correct=String(animeYear(a));return records.some(record=>record.value===correct)?[{label:correct,value:correct},...shuffle(records.filter(record=>record.value!==correct)).slice(0,3)]:[]}
function yearTitleChoiceRecordsForAnime(a){const year=animeYear(a);if(!Number.isInteger(year)||year<=1900)return [];const records=new Map(),correctTitle=titleOf(a),correctKey=normalizeAnswer(correctTitle);if(correctTitle&&correctKey)records.set(correctKey,{label:correctTitle,value:correctTitle,mediaId:Number(a.id)});const usedAliases=new Set(titleAnswerVariants(a).map(normalizeAnswer).filter(Boolean));const add=item=>{if(!item||Number(item.id)===Number(a.id)||animeYear(item)===year||!titleUsable(item))return;const value=titleOf(item),key=normalizeAnswer(value);if(!value||!key||records.has(key)||titleChoiceAliasesConflict(usedAliases,item))return;records.set(key,{label:value,value,mediaId:Number(item.id)});for(const alias of titleAnswerVariants(item).map(normalizeAnswer).filter(Boolean))usedAliases.add(alias)};for(let i=0;i<Math.min(pool.length,96)&&records.size<4;i++)add(pool[randomInt(pool.length)]);if(records.size<4)for(const item of pool){if(records.size>=4)break;add(item)}return [...records.values()]}
function makeYearTitleOptions(a){const records=yearTitleChoiceRecordsForAnime(a),correctKey=normalizeAnswer(titleOf(a)),correct=records.find(record=>normalizeAnswer(record.value)===correctKey);return correct?[correct,...shuffle(records.filter(record=>normalizeAnswer(record.value)!==correctKey)).slice(0,3)]:[]}
function studioTitleChoiceRecordsForAnime(a){const ownStudios=new Set((a?.studios?.nodes||[]).map(node=>normalizeAnswer(node?.name)).filter(Boolean));if(!ownStudios.size)return [];const correctTitle=titleOf(a),correctKey=normalizeAnswer(correctTitle);if(!correctKey)return [];const records=new Map([[correctKey,{label:correctTitle,value:correctTitle,mediaId:Number(a.id)}]]),usedAliases=new Set(titleAnswerVariants(a).map(normalizeAnswer).filter(Boolean));const add=item=>{if(!item||Number(item.id)===Number(a.id)||!titleUsable(item))return;const studios=(item?.studios?.nodes||[]).map(node=>normalizeAnswer(node?.name)).filter(Boolean);if(studios.some(name=>ownStudios.has(name)))return;const value=titleOf(item),key=normalizeAnswer(value);if(!value||!key||records.has(key)||titleChoiceAliasesConflict(usedAliases,item))return;records.set(key,{label:value,value,mediaId:Number(item.id)});for(const alias of titleAnswerVariants(item).map(normalizeAnswer).filter(Boolean))usedAliases.add(alias)};for(let i=0;i<Math.min(pool.length,96)&&records.size<4;i++)add(pool[randomInt(pool.length)]);if(records.size<4)for(const item of pool){if(records.size>=4)break;add(item)}return [...records.values()]}
function makeStudioTitleOptions(a){const records=studioTitleChoiceRecordsForAnime(a),correctKey=normalizeAnswer(titleOf(a)),correct=records.find(record=>normalizeAnswer(record.value)===correctKey);return correct?[correct,...shuffle(records.filter(record=>normalizeAnswer(record.value)!==correctKey)).slice(0,3)]:[]}
function episodeChoiceRecordsForAnime(a){const correct=Number(a?.episodes);if(!Number.isInteger(correct)||correct<=0)return [];const records=[{label:String(correct)+'話',value:String(correct)}];for(const value of questionChoiceSummary().episodeKeys){if(value===String(correct))continue;records.push({label:String(value)+'話',value:String(value)});if(records.length>=4)break}return records}
function quizGenreLabel(value){const ja={Action:'アクション',Adventure:'アドベンチャー',Comedy:'コメディ',Drama:'ドラマ',Fantasy:'ファンタジー',Horror:'ホラー','Mahou Shoujo':'魔法少女',Mecha:'メカ',Music:'音楽',Mystery:'ミステリー',Psychological:'心理',Romance:'恋愛','Sci-Fi':'SF','Slice of Life':'日常',Sports:'スポーツ',Supernatural:'超常',Thriller:'サスペンス'};return lang==='ja'?(ja[value]||value):value}
function genreChoiceRecordsForAnime(a){const own=[...new Set((Array.isArray(a?.genres)?a.genres:[]).map(value=>String(value||'').trim()).filter(Boolean))];if(!own.length)return [];const correct=own[randomInt(own.length)],excluded=new Set(own),records=[{label:quizGenreLabel(correct),value:quizGenreLabel(correct)}];for(const genre of questionChoiceSummary().genreKeys){if(excluded.has(genre))continue;const label=quizGenreLabel(genre);if(records.some(record=>record.value===label))continue;records.push({label,value:label});if(records.length>=4)break}return records}
function quizFormatLabel(value){const labels={ja:{TV:'TVアニメ',TV_SHORT:'短編アニメ',MOVIE:'劇場版',OVA:'OVA',ONA:'Webアニメ',SPECIAL:'特別編'},en:{TV:'TV',TV_SHORT:'TV short',MOVIE:'Movie',OVA:'OVA',ONA:'ONA',SPECIAL:'Special'},ko:{TV:'TV 애니메이션',TV_SHORT:'단편 애니메이션',MOVIE:'극장판',OVA:'OVA',ONA:'웹 애니메이션',SPECIAL:'스페셜'},zh:{TV:'电视动画',TV_SHORT:'短篇动画',MOVIE:'剧场版',OVA:'OVA',ONA:'网络动画',SPECIAL:'特别篇'},es:{TV:'TV',TV_SHORT:'TV corto',MOVIE:'Película',OVA:'OVA',ONA:'ONA',SPECIAL:'Especial'},fr:{TV:'TV',TV_SHORT:'Court métrage TV',MOVIE:'Film',OVA:'OVA',ONA:'ONA',SPECIAL:'Spécial'},pt:{TV:'TV',TV_SHORT:'TV curto',MOVIE:'Filme',OVA:'OVA',ONA:'ONA',SPECIAL:'Especial'},de:{TV:'TV',TV_SHORT:'TV-Kurzformat',MOVIE:'Film',OVA:'OVA',ONA:'ONA',SPECIAL:'Spezial'}};return labels[lang]?.[value]||labels.en[value]||value}
function metadataValueChoiceRecords(a,field,labeler){const correct=String(a?.[field]??'').trim();if(!correct)return [];const records=[{label:labeler(correct),value:labeler(correct)}];for(const raw of questionChoiceSummary()[field+'Keys']||[]){const value=String(raw||'').trim();if(!value||value===correct)continue;const label=labeler(value);if(records.some(record=>record.value===label))continue;records.push({label,value:label});if(records.length>=4)break}return records}
function formatChoiceRecordsForAnime(a){return metadataValueChoiceRecords(a,'format',quizFormatLabel)}

function questionModeHasFourChoices(a,mode){const format=$('#answerFormatSelect')?.value||'choices';if(format==='typed'&&playMode!=='daily'&&playMode!=='rush')return mode!=='titleSynopsis';const titleKey=normalizeAnswer(titleOf(a));if(mode==='image')return !!titleKey&&titleImageIsSafe(a)&&hasFourDistinctTitleChoices(a);if(mode==='studio')return studioTitleChoiceRecordsForAnime(a).length>=4;if(mode==='year')return yearTitleChoiceRecordsForAnime(a).length>=4;if(mode==='titleStudio')return !!a.studios?.nodes?.[0]?.name&&hasFourDistinctStudioChoices(a);const summary=questionChoiceSummary();if(mode==='titleYear')return yearChoiceRecordsForAnime(a).length>=4;if(mode==='synonym')return !!titleKey&&hasFourDistinctTitleChoices(a)&&uniqueAliasCandidates(a).length>0;if(mode==='synopsis')return hasFourDistinctSynopsisChoices(a,true);if(mode==='titleSynopsis')return hasFourDistinctSynopsisChoices(a,false);if(mode==='titleEpisodes')return episodeChoiceRecordsForAnime(a).length>=4;if(mode==='titleGenre')return genreChoiceRecordsForAnime(a).length>=4;if(mode==='titleFormat')return formatChoiceRecordsForAnime(a).length>=4;if(mode==='character')return characterRecords([a]).some(record=>isSingleAnimeCharacter(record,summary))&&!!titleKey&&hasFourDistinctTitleChoices(a,summary);if(mode==='titleCharacter')return characterRecordsWithFourTitleChoicesForAnime(a,summary).length>0;if(mode==='characterImage')return characterRecordsWithFourChoicesForAnime(a,summary,false).length>0;if(mode==='characterNameImage')return characterRecordsWithFourChoicesForAnime(a,summary,true).length>0;return false}

function availableQuestionModes(a,format=$('#answerFormatSelect')?.value||'choices'){
 const modes=[];
 if(titleUsable(a)&&titleImageIsSafe(a))modes.push('image');
 if(titleUsable(a)&&a?.studios?.nodes?.[0]?.name){modes.push('studio');modes.push('titleStudio')}
 if(titleUsable(a)&&uniqueAliasCandidates(a).length)modes.push('synonym');
 if(titleUsable(a)&&Number.isInteger(animeYear(a))&&animeYear(a)>1900){modes.push('year');modes.push('titleYear')}
 if(titleUsable(a)&&hasUsableSynopsis(a)){modes.push('synopsis');if(format!=='typed')modes.push('titleSynopsis')}
 if(titleUsable(a)&&a?.format!=='MOVIE'&&Number.isInteger(Number(a?.episodes))&&Number(a.episodes)>0)modes.push('titleEpisodes');
 if(titleUsable(a)&&Array.isArray(a?.genres)&&a.genres.length)modes.push('titleGenre');
 if(titleUsable(a)&&a?.format)modes.push('titleFormat');
 
 
 return modes.filter(mode=>questionModeHasFourChoices(a,mode));
}
function hasAnyQuestionMode(a,format=$('#answerFormatSelect')?.value||'choices'){
 return availableQuestionModes(a,format).length>0;
}

function usablePool(mode,answerFormat=$('#answerFormatSelect')?.value||'choices',validateChoices=true){return pool.filter(a=>isEligibleBaseAnime(a,mode,answerFormat)&&(answerFormat==='typed'||!validateChoices||questionModeHasFourChoices(a,mode)))}
async function extendQuestionsFromPool(items){
 if(!items||!questions.length||$('#quizArea').classList.contains('hidden'))return;
 // Fixed-length normal, daily and rush quizzes do not need background question expansion.
 // Avoid rebuilding the full catalogue index during an active round when no questions can be added.
 if(playMode!=='endless'&&!(playMode==='normal'&&questions.length<requestedQuestionCount))return;
 const sourcePool=pool;
 await ensureQuestionChoiceSummaryAsync();
 if(pool!==sourcePool)return;
 prepareDifficultyTiers(sourcePool);
 const mode=$('#modeSelect').value,format=$('#answerFormatSelect').value,eligible=uniqueAnimeById(mode==='mixed'?items.filter(a=>isUsableAnime(a)&&titleUsable(a)&&availableQuestionModes(a,format).length>0):usablePool(mode,format)).filter(a=>matchesDifficulty(a,format,mode)).filter(a=>format!=='typed'||typedTitleEligible(a)),seen=new Set(questions.map(a=>Number(a.id)));
 const additions=shuffle(eligible.filter(a=>!seen.has(Number(a.id))));
 const limit=playMode==='endless'?additions.length:Math.max(0,requestedQuestionCount-questions.length);
 if(limit>0)questions.push(...additions.slice(0,limit));
 if(index<questions.length-1)$('#next').textContent=tr('next');
}
const CURATED_JA_ALIASES=[
{titles:["進撃の巨人 Season２","進撃の巨人 Season 2","Shingeki no Kyojin Season 2","Attack on Titan Season 2"],alias:'進撃2期'},
{titles:["進撃の巨人 Season３","進撃の巨人 Season 3","Shingeki no Kyojin Season 3","Attack on Titan Season 3"],alias:'進撃3期'},
{titles:["進撃の巨人 Season３ Part.2","進撃の巨人 Season 3 Part 2","Shingeki no Kyojin Season 3 Part 2","Attack on Titan Season 3 Part 2"],alias:'進撃3期後半'},
{titles:["僕だけがいない街","Boku dake ga Inai Machi","Erased"],alias:'僕街'},
{titles:["モブサイコ100","Mob Psycho 100"],alias:'モブサイコ1期'},
{titles:["モブサイコ100 Ⅲ","Mob Psycho 100 III","Mob Psycho 100 3rd Season"],alias:'モブサイコ3期'},
{titles:["僕のヒーローアカデミア６","僕のヒーローアカデミア 6th Season","Boku no Hero Academia 6th Season","My Hero Academia Season 6"],alias:'ヒロアカ6期'},
{titles:["鬼滅の刃 刀鍛冶の里編","Kimetsu no Yaiba: Katanakaji no Sato-hen","Demon Slayer: Swordsmith Village Arc"],alias:'鬼滅刀鍛冶編'},
{titles:["鬼滅の刃 柱稽古編","Kimetsu no Yaiba: Hashira Geiko-hen","Demon Slayer: Hashira Training Arc"],alias:'鬼滅柱稽古編'},
{titles:["オーバーロードⅡ","Overlord II","Overlord 2"],alias:'オバロ2期'},
{titles:["無職転生Ⅱ ～異世界行ったら本気だす～","Mushoku Tensei II","Mushoku Tensei: Jobless Reincarnation Season 2"],alias:'無職転生2期'},
{titles:["ハイキュー!! TO THE TOP","Haikyuu!! To the Top","Haikyuu to the Top"],alias:'ハイキュー4期'},
{titles:["七つの大罪 戒めの復活","Nanatsu no Taizai: Imashime no Fukkatsu","The Seven Deadly Sins: Revival of The Commandments"],alias:'七つの大罪2期'},
{titles:["コードギアス 反逆のルルーシュ R2","Code Geass: Lelouch of the Rebellion R2"],alias:'ギアスR2'},
{titles:["この素晴らしい世界に祝福を！2","この素晴らしい世界に祝福を! 2","Kono Subarashii Sekai ni Shukufuku wo! 2","KonoSuba 2"],alias:'このすば2期'},
{titles:["とある科学の超電磁砲S","Toaru Kagaku no Railgun S","A Certain Scientific Railgun S"],alias:'レールガンS'},
{titles:["とある魔術の禁書目録Ⅱ","とある魔術の禁書目録 II","Toaru Majutsu no Index II","A Certain Magical Index II"],alias:'禁書2期'},
{titles:["ソードアート・オンライン アリシゼーション","Sword Art Online: Alicization"],alias:'SAOアリシゼーション'},
{titles:["ジョジョの奇妙な冒険 黄金の風","JoJo no Kimyou na Bouken: Ougon no Kaze","JoJo's Bizarre Adventure: Golden Wind"],alias:'ジョジョ5部'},
{titles:["かぐや様は告らせたい-ウルトラロマンティック-","Kaguya-sama wa Kokurasetai: Ultra Romantic"],alias:'かぐや様3期'},
{titles:['青春ブタ野郎はバニーガール先輩の夢を見ない','Seishun Buta Yarou wa Bunny Girl Senpai no Yume wo Minai','Rascal Does Not Dream of Bunny Girl Senpai'],alias:'青ブタ'},
{titles:['Re:ゼロから始める異世界生活','Re:Zero kara Hajimeru Isekai Seikatsu','Re:ZERO -Starting Life in Another World-'],alias:'リゼロ'},
{titles:['STEINS;GATE','シュタインズ・ゲート'],alias:'シュタゲ'},
{titles:['ノーゲーム・ノーライフ','No Game No Life'],alias:'ノゲノラ'},
{titles:['ソードアート・オンライン','Sword Art Online'],alias:'SAO'},
{titles:['この素晴らしい世界に祝福を！','この素晴らしい世界に祝福を!','Kono Subarashii Sekai ni Shukufuku wo!','KonoSuba'],alias:'このすば'},
{titles:['あの日見た花の名前を僕達はまだ知らない。','あの日見た花の名前を僕達はまだ知らない','Ano Hi Mita Hana no Namae wo Bokutachi wa Mada Shiranai'],alias:'あの花'},
{titles:['無職転生 ～異世界行ったら本気だす～','Mushoku Tensei: Isekai Ittara Honki Dasu'],alias:'無職転生'},
{titles:['進撃の巨人','Shingeki no Kyojin','Attack on Titan'],alias:'進撃'},
{titles:['鬼滅の刃','Kimetsu no Yaiba','Demon Slayer: Kimetsu no Yaiba'],alias:'鬼滅'},
{titles:['呪術廻戦','Jujutsu Kaisen'],alias:'呪術'},
{titles:['僕のヒーローアカデミア','Boku no Hero Academia','My Hero Academia'],alias:'ヒロアカ'},
{titles:['転生したらスライムだった件','Tensei shitara Slime Datta Ken','That Time I Got Reincarnated as a Slime'],alias:'転スラ'},
{titles:['とある科学の超電磁砲','Toaru Kagaku no Railgun'],alias:'レールガン'},
{titles:['とある魔術の禁書目録','Toaru Majutsu no Index'],alias:'禁書目録'},
{titles:['魔法少女まどか☆マギカ','魔法少女まどか★マギカ','Puella Magi Madoka Magica'],alias:'まどマギ'},
{titles:['Angel Beats!'],alias:'AB'},
{titles:['Charlotte','シャーロット'],alias:'シャーロット'},
{titles:['サマータイムレンダ','Summer Time Rendering'],alias:'サマレン'},
{titles:['葬送のフリーレン','Sousou no Frieren','Frieren: Beyond Journey’s End'],alias:'フリーレン'},
{titles:['SPY×FAMILY','SPY x FAMILY'],alias:'スパイファミリー'},
{titles:['東京喰種トーキョーグール','東京喰種','Tokyo Ghoul'],alias:'東京喰種'},
{titles:['五等分の花嫁','Go-Toubun no Hanayome'],alias:'五等分'},
{titles:['かぐや様は告らせたい','Kaguya-sama wa Kokurasetai'],alias:'かぐや様'},
{titles:['ぼっち・ざ・ろっく！','ぼっち・ざ・ろっく!','Bocchi the Rock!'],alias:'ぼざろ'},
{titles:['ブラッククローバー','Black Clover'],alias:'ブラクロ'},
{titles:['ヴィンランド・サガ','Vinland Saga'],alias:'ヴィンサガ'},
{titles:['炎炎ノ消防隊','Enen no Shouboutai','Fire Force'],alias:'炎炎'},
{titles:['カウボーイビバップ','Cowboy Bebop'],alias:'ビバップ'},
{titles:['デス・パレード','Death Parade'],alias:'デスパレ'},
{titles:['青の祓魔師','Ao no Exorcist','Blue Exorcist'],alias:'青エク'},
{titles:['暗殺教室','Ansatsu Kyoushitsu','Assassination Classroom'],alias:'暗教'},
{titles:['賭ケグルイ','Kakegurui'],alias:'賭ケグル'},
{titles:['文豪ストレイドッグス','Bungou Stray Dogs'],alias:'文スト'},
{titles:['キルラキル','Kill la Kill'],alias:'キルラ'},
{titles:['オーバーロード','Overlord'],alias:'オバロ'},
{titles:['ようこそ実力至上主義の教室へ','Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e','Classroom of the Elite'],alias:'よう実'},
{titles:['その着せ替え人形は恋をする','Sono Bisque Doll wa Koi wo Suru','My Dress-Up Darling'],alias:'着せ恋'},
{titles:['ダーリン・イン・ザ・フランキス','Darling in the FranXX'],alias:'ダリフラ'},
{titles:['モブサイコ100 II','Mob Psycho 100 II'],alias:'モブサイコ2期'},
{titles:['ハイキュー!! セカンドシーズン','Haikyuu!! Second Season'],alias:'ハイキュー2期'},
{titles:['SPY×FAMILY','SPY x FAMILY'],alias:'スパファミ'},
{titles:['暗殺教室 第2期','Assassination Classroom Second Season','Ansatsu Kyoushitsu 2nd Season'],alias:'暗教2期'},
{titles:['SPY×FAMILY Season 2','SPY×FAMILY 第2期','SPY x FAMILY Season 2'],alias:'スパファミ2期'},
{titles:['ヴィンランド・サガ SEASON 2','Vinland Saga Season 2'],alias:'ヴィンサガ2期'},
{titles:['炎炎ノ消防隊 弐ノ章','Fire Force Season 2','Enen no Shouboutai: Ni no Shou'],alias:'炎炎2期'},
{titles:['青の祓魔師 京都不浄王篇','Blue Exorcist: Kyoto Saga','Ao no Exorcist: Kyoto Fujouou-hen'],alias:'青エク2期'},
{titles:['賭ケグルイ××','Kakegurui XX'],alias:'賭ケグルイ2期'},
{titles:['文豪ストレイドッグス 第2期','Bungou Stray Dogs 2nd Season','Bungo Stray Dogs Season 2'],alias:'文スト2期'}
];
function aliasCandidates(a){const titles=[a.title?.romaji,a.title?.english,a.title?.native].filter(Boolean).map(t=>String(t).trim());const exactTitleKeys=new Set(titles.map(normalizeAnswer));const result=[];if(lang==='ja'){const curated=CURATED_JA_ALIASES.find(entry=>entry.titles.some(t=>exactTitleKeys.has(normalizeAnswer(t))));if(curated)result.push(curated.alias)}for(const title of [a.title?.romaji,a.title?.english].filter(Boolean)){const words=String(title).normalize('NFKC').match(/[A-Za-z0-9]+/g)||[];if(words.length>=2){const initials=words.map(word=>word[0]).join('').toUpperCase();if(initials.length>=2&&initials.length<=8&&!exactTitleKeys.has(normalizeAnswer(initials)))result.push(initials)}}for(const raw of a.synonyms||[]){if(typeof raw!=='string')continue;const value=raw.trim(),key=normalizeAnswer(value);if([...value].length<2||!key||exactTitleKeys.has(key))continue;if(lang==='ja'&&!/[ぁ-んァ-ヶ一-龯]/.test(value)&&!(/^[A-Za-z0-9]{2,8}$/.test(value)))continue;result.push(value)}return [...new Set(result.filter(Boolean))]}function uniqueAliasCandidates(a,summary=questionChoiceSummary()){const id=Number(a?.id);return aliasCandidates(a).filter(alias=>{const key=normalizeAnswer(alias),owners=summary.aliasAnimeOwners.get(key);return key&&owners?.size===1&&owners.has(id)})}function validAlias(a,s){return uniqueAliasCandidates(a).some(x=>normalizeAnswer(x)===normalizeAnswer(s))}

function titleChoiceAliasesConflict(usedAliases,anime){return titleAnswerVariants(anime).some(title=>{const key=normalizeAnswer(title);return key&&usedAliases.has(key)})}function titleChoiceRecordsForAnime(a){const ownTitle=titleOf(a),records=new Map(),ownKey=normalizeAnswer(ownTitle),usedAliases=new Set(titleAnswerVariants(a).map(normalizeAnswer).filter(Boolean));if(ownTitle&&ownKey)records.set(ownKey,{label:ownTitle,value:ownTitle,mediaId:Number(a.id)});if(records.size>=4)return [...records.values()];const start=pool.length?randomInt(pool.length):0;for(let offset=0;offset<pool.length&&records.size<4;offset++){const item=pool[(start+offset)%pool.length];if(Number(item?.id)===Number(a?.id)||!titleUsable(item))continue;const title=titleOf(item),key=normalizeAnswer(title);if(!title||!key||records.has(key)||titleChoiceAliasesConflict(usedAliases,item))continue;records.set(key,{label:title,value:title,mediaId:Number(item.id)});for(const alias of titleAnswerVariants(item).map(normalizeAnswer).filter(Boolean))usedAliases.add(alias)}return [...records.values()]}function makeTitleOptions(a){const records=titleChoiceRecordsForAnime(a);if(!records.length)return [];const correctKey=normalizeAnswer(titleOf(a));const correct=records.find(record=>normalizeAnswer(record.value)===correctKey);const distractors=shuffle(records.filter(record=>normalizeAnswer(record.value)!==correctKey));return correct?[correct,...distractors.slice(0,3)]:shuffle(records).slice(0,4)}
const synopsisSimilarityCache=new Map();
function synopsisSimilarity(a,b){const x=normalizeAnswer(a),y=normalizeAnswer(b);if(!x||!y)return 0;if(x===y)return 1;const leftText=x<y?x:y,rightText=x<y?y:x,key=JSON.stringify([leftText,rightText]);if(synopsisSimilarityCache.has(key))return synopsisSimilarityCache.get(key);const grams=value=>{const chars=[...value],set=new Set();if(chars.length<4){for(let i=0;i<chars.length;i++)set.add(chars.slice(i,i+2).join(''));return set}for(let i=0;i<=chars.length-3;i++)set.add(chars.slice(i,i+3).join(''));return set};const left=grams(leftText),right=grams(rightText);let common=0;for(const gram of left)if(right.has(gram))common++;const score=common/Math.max(1,left.size+right.size-common);if(synopsisSimilarityCache.size>=20000)synopsisSimilarityCache.delete(synopsisSimilarityCache.keys().next().value);synopsisSimilarityCache.set(key,score);return score}function synopsisJapaneseAnswerTitle(a){
 if(lang!=='ja')return titleOf(a);
 const native=String(a?.title?.native||'').normalize('NFC').trim();
 // For Japanese-origin productions the native title is the original Japanese title,
 // including titles written entirely in kanji.
 if(a?.countryOfOrigin==='JP'&&native)return native;
 const candidates=[native,...(Array.isArray(a?.synonyms)?a.synonyms:[]),a?.title?.english,a?.title?.romaji]
  .filter(value=>typeof value==='string'&&value.trim())
  .map(value=>value.normalize('NFC').trim());
 return candidates.find(value=>/[ぁ-んァ-ヶ]/.test(value))||'';
}
const synopsisChoiceCache=new WeakMap();
function synopsisChoiceRecords(a,answerIsTitle=false){
 const summary=questionChoiceSummary();
 let cache=synopsisChoiceCache.get(summary);
 if(!cache){cache=new Map();synopsisChoiceCache.set(summary,cache)}
 const cacheKey=String(Number(a?.id)||0)+'|'+(answerIsTitle?'title':'synopsis');
 if(cache.has(cacheKey))return cache.get(cacheKey);
 const options=new Map(),answerKeys=new Set(),chosenTexts=[],correctSynopsis=synopsisText(a),correctKey=normalizeAnswer(correctSynopsis),correctAnswer=answerIsTitle?synopsisJapaneseAnswerTitle(a):descriptionOf(a),correctAnswerKey=normalizeAnswer(correctAnswer);
 if(!correctSynopsis||!correctKey||!correctAnswerKey){cache.set(cacheKey,[]);return []}
 options.set(correctKey,{label:correctSynopsis,value:correctAnswer,mediaId:Number(a.id)});answerKeys.add(correctAnswerKey);chosenTexts.push(correctSynopsis);
 const candidates=summary.synopsisCandidates,start=candidates.length?randomInt(candidates.length):0;
 const addCandidate=(item,similarityLimit)=>{
  if(options.size>=4)return;
  const synopsis=synopsisText(item),key=normalizeAnswer(synopsis),answer=answerIsTitle?synopsisJapaneseAnswerTitle(item):descriptionOf(item),answerKey=normalizeAnswer(answer);
  if(!synopsis||!key||!answerKey||options.has(key)||answerKeys.has(answerKey)||chosenTexts.some(text=>synopsisSimilarity(text,synopsis)>=similarityLimit))return;
  options.set(key,{label:synopsis,value:answer,mediaId:Number(item.id)});answerKeys.add(answerKey);chosenTexts.push(synopsis)
 };
 const visit=similarityLimit=>{for(let offset=0;offset<candidates.length&&options.size<4;offset++){const item=candidates[(start+offset)%candidates.length];if(Number(item?.id)!==Number(a.id))addCandidate(item,similarityLimit)}};
 visit(0.86);if(options.size<4)visit(0.94);if(options.size<4)visit(1.01);
 const result=[...options.values()];
 cache.set(cacheKey,result);
 return result
}
function hasFourDistinctSynopsisChoices(a,answerIsTitle=false){return synopsisChoiceRecords(a,answerIsTitle).length>=4}
function makeSynopsisOptions(a,answerIsTitle=false){return shuffle(synopsisChoiceRecords(a,answerIsTitle))}
function normalizeAnswer(value){return String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s　・･:：!！?？.,，。'"“”「」『』()（）‐‑–—―−_-]/g,'').trim()}
function titleAnswerVariants(a){const titles=[a?.title?.native,a?.title?.english,a?.title?.romaji,titleOf(a),...(a?.synonyms||[])].filter(Boolean),variants=[...titles];for(const title of [a?.title?.english,a?.title?.romaji,...(a?.synonyms||[])].filter(Boolean)){const words=String(title).normalize('NFKC').match(/[A-Za-z0-9]+/g)||[];if(words.length>=2){const initials=words.map(word=>word[0]).join('');if(initials.length>=2&&initials.length<=8)variants.push(initials)}}const seasonPatterns=[/\s*[-:：–—|｜]?\s*(?:第\s*\d+\s*(?:期|シーズン|season)|season\s*\d+|\d+(?:st|nd|rd|th)?\s*season|s\s*\d+)\s*$/i,/\s*[-:：–—|｜]?\s*(?:final\s+season|the\s+final\s+season|second\s+season|third\s+season|fourth\s+season|fifth\s+season|first\s+season|ファースト\s*シーズン|セカンド\s*シーズン|サード\s*シーズン|フォース\s*シーズン|フィフス\s*シーズン|part\s*\d+|第\s*\d+\s*部)\s*$/i,/\s*[-:：–—|｜]?\s*(?:第\s*\d+\s*クール|\d+\s*クール)\s*$/i],moviePatterns=[/^\s*(?:劇場版|the\s+movie|movie\s+version|anime\s+film|film\s+version)\s*[:：\-–—]?\s*/i,/\s*[-:：–—|｜]?\s*(?:劇場版|the\s+movie|movie\s+version|anime\s+film|film\s+version|movie|film)\s*$/i];for(const title of titles){let base=String(title).normalize('NFKC').trim();for(let pass=0;pass<3;pass++){const before=base;for(const pattern of [...seasonPatterns,...moviePatterns])base=base.replace(pattern,'').trim();if(base===before)break}if(base&&base!==title)variants.push(base)}return [...new Set(variants)]}function distinctTitleDistractor(correctAnime,candidate){const correctKeys=new Set(titleAnswerVariants(correctAnime).map(normalizeAnswer).filter(Boolean));return !titleAnswerVariants(candidate).some(title=>{const key=normalizeAnswer(title);return key&&correctKeys.has(key)})}
function acceptedAnswers(a,mode,correct){if(mode==='titleYear')return [String(animeYear(a))];if(mode==='titleStudio')return [a.studios?.nodes?.[0]?.name||''];return titleAnswerVariants(a)}
function answersMatch(input,a,mode,correct){const typed=normalizeAnswer(input);if(!typed)return false;const candidates=acceptedAnswers(a,mode,correct).map(normalizeAnswer).filter(Boolean);return candidates.some(x=>x===typed)}
function titleOf(a){if(lang==='ja'){const native=String(a?.title?.native||'').normalize('NFC').trim();if(a?.countryOfOrigin==='JP'&&native)return native;const candidates=[native,...(Array.isArray(a?.synonyms)?a.synonyms:[]),a?.title?.english,a?.title?.romaji].filter(value=>typeof value==='string'&&value.trim()).map(value=>value.normalize('NFC').trim());const japanese=candidates.find(value=>/[ぁ-んァ-ヶ]/.test(value));if(japanese)return japanese;if(native)return native;const english=String(a?.title?.english||'').trim();if(english)return english;return String(a?.title?.romaji||'').trim()}return a?.title?.english||a?.title?.romaji||a?.title?.native||'Unknown title'}
function randomInt(maxExclusive){if(!Number.isSafeInteger(maxExclusive)||maxExclusive<=1)return 0;const cryptoSource=globalThis.crypto;if(cryptoSource?.getRandomValues){try{const range=0x100000000,limit=Math.floor(range/maxExclusive)*maxExclusive,buffer=new Uint32Array(1);do{cryptoSource.getRandomValues(buffer)}while(buffer[0]>=limit);return buffer[0]%maxExclusive}catch(e){}}return Math.floor(Math.random()*maxExclusive)}
// Fisher–Yates: uniform shuffle without replacement over the currently loaded eligible catalogue.
function shuffle(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
const questionImagePreloadCache=new Map();
let animeLoadPromise=null;async function prepare(){if(animeLoadPromise)return animeLoadPromise;animeLoadPromise=(async()=>{ $('#quizStatus').textContent=tr('loading');$('#start').classList.remove('hidden');$('#start').disabled=false;$('#start').textContent=tr('start')+(lang==='ja'?'（作品データ読み込み中）':' (loading anime data)');try{pool=await fetchAnime();if(lateSharedCatalogItems.length){pool=deduplicateQuestionPool(mergeAnimeCollection([...pool,...lateSharedCatalogItems]));lateSharedCatalogItems=[];sharedCatalogActive=true;}if(!pool.length)throw new Error('作品データが0件でした。');
 // Build the shared question index before advertising that the quiz is ready.
 // This moves the expensive first-run work out of the Start-button interaction.
 const initialMode=$('#modeSelect')?.value||'mixed';
 if(!['image','titleStudio'].includes(initialMode)){
  $('#quizStatus').textContent=lang==='ja'?'問題データを準備しています…':'Preparing question data…';
  try{await ensureQuestionChoiceSummaryAsync()}
  catch(error){console.warn('Initial question index preparation deferred:',error)}
 }
 // Prewarm the selected question format after the ready state is displayed.
 // The work runs only during idle time and is reused when the player presses Start.
 const poolProgress=$('#animePoolProgress');if(poolProgress)poolProgress.textContent=sharedCatalogActive?(lang==='ja'?('共通カタログ：'+pool.length.toLocaleString()+'作品（毎日更新）'):('Shared catalogue: '+pool.length.toLocaleString()+' anime (updated daily)')):(lang==='ja'?('現在利用可能：'+pool.length.toLocaleString()+'作品。取得可能な作品をバックグラウンドで追加します。'):('Currently available: '+pool.length.toLocaleString()+' anime. More available entries are loading in the background.'));$('#quizStatus').textContent=sharedCatalogActive?(lang==='ja'?pool.length+'作品の共通カタログを読み込みました。クイズを開始できます。':pool.length+' shared anime loaded. Ready to start.'):(lang==='ja'?pool.length+'作品を読み込みました。クイズを開始できます。残りはバックグラウンドで追加します。':pool.length+' anime loaded. Ready to start; more are loading in the background.');$('#start').classList.remove('hidden');$('#start').textContent=tr('start');scheduleEligibleCandidatePrewarm();if(typeof renderFeaturedRail==='function'){const render=()=>{if(pool.length)renderFeaturedRail(pool)};if('requestIdleCallback' in window)requestIdleCallback(render,{timeout:10000});else setTimeout(render,5000)}return pool}catch(e){console.error('Anime data loading failed:',e);$('#quizStatus').textContent=lang==='ja'?('読み込み失敗：'+e.message+' 「再読み込みして開始」を押して再試行してください。'):('Load failed: '+e.message+' Press retry to try again.');$('#start').classList.remove('hidden');$('#start').textContent=tr('retry');return []}finally{animeLoadPromise=null}})();return animeLoadPromise}
function dateKey(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dailyOrder(list){const day=dateKey();const hash=s=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};return [...list].sort((a,b)=>hash(day+':'+a.id)-hash(day+':'+b.id))}
function uniqueAnimeById(items){const seen=new Set();return (items||[]).filter(item=>{const id=Number(item?.id);if(!Number.isFinite(id)||id<=0||seen.has(id))return false;seen.add(id);return true})}
let startRetryInProgress=false,quizStartInProgress=false,quizFinished=false;
// Cache expensive eligibility checks for repeated rounds with the same pool and settings.
let eligibleCandidateCache=new Map(),eligibleCandidateCachePool=null,eligibleCandidateCacheLength=0;
const eligibleCandidateBuilds=new Map();
function eligibleCandidateCacheKey(mode,format,ignoreDifficulty=false){
 return [mode,format,playMode,difficultyModes(),difficultyStatsRevision,ignoreDifficulty?'all':'filtered'].join('|');
}
function isEligibleBaseAnime(a,mode,format){
 if(!isUsableAnime(a))return false;
 if(mode==='mixed')return titleUsable(a);
 if(format==='typed'&&mode==='titleSynopsis')return false;
 if(mode==='image'&&!titleImageIsSafe(a))return false;
 if(format==='typed'&&!typedTitleEligible(a))return false;
 if(['image','studio','year','synonym','titleYear','titleStudio','synopsis','titleSynopsis','titleEpisodes','titleGenre','titleFormat'].includes(mode)&&!titleUsable(a))return false;
 if(['titleStudio','studio'].includes(mode)&&!a.studios?.nodes?.[0]?.name)return false;
 if(['titleYear','year'].includes(mode)&&(!Number.isInteger(animeYear(a))||animeYear(a)<=1900))return false;
 if(mode==='synonym'&&!uniqueAliasCandidates(a).length)return false;
 if(['synopsis','titleSynopsis'].includes(mode)&&!hasUsableSynopsis(a))return false;
 if(mode==='titleEpisodes'&&(a?.format==='MOVIE'||!Number.isInteger(Number(a?.episodes))||Number(a.episodes)<=0))return false;
 if(mode==='titleGenre'&&(!Array.isArray(a?.genres)||!a.genres.length))return false;
 if(mode==='titleFormat'&&!a?.format)return false;
 
 return true;
}
async function getEligibleCandidatePoolAsync(mode,format,ignoreDifficulty=false){
 const sourcePool=pool,sourceLength=sourcePool.length,sourceRevision=difficultyStatsRevision;
 if(eligibleCandidateCachePool!==sourcePool||eligibleCandidateCacheLength!==sourceLength){
  eligibleCandidateCache.clear();eligibleCandidateCachePool=sourcePool;eligibleCandidateCacheLength=sourceLength;
 }
 const key=eligibleCandidateCacheKey(mode,format,ignoreDifficulty);
 const cached=eligibleCandidateCache.get(key);
 if(cached)return cached;
 const pending=eligibleCandidateBuilds.get(key);
 if(pending&&pending.pool===sourcePool&&pending.length===sourceLength&&pending.revision===sourceRevision)return pending.promise;
 const build=(async()=>{
  if(!['image','studio','year','titleStudio'].includes(mode))await ensureQuestionChoiceSummaryAsync();
  if(pool!==sourcePool||pool.length!==sourceLength)return [];
  // Keep each background eligibility batch short so the Start button and other controls stay responsive.
  const eligible=[],seen=new Set(),chunkSize=24;
  for(let offset=0;offset<sourceLength;offset+=chunkSize){
   if(document.body.classList.contains('quiz-active'))return [];
   const limit=Math.min(sourceLength,offset+chunkSize);
   for(let i=offset;i<limit;i++){
    const anime=sourcePool[i],id=Number(anime?.id);
    if(!Number.isSafeInteger(id)||id<=0||seen.has(id))continue;
    if(!isEligibleBaseAnime(anime,mode,format))continue;
    // Match the previous filter-then-deduplicate order exactly.
    seen.add(id);
    if(!ignoreDifficulty&&!matchesDifficulty(anime,format,mode))continue;
    if(format==='typed'&&!typedTitleEligible(anime))continue;
    const hasQuestion=mode==='mixed'
     ?availableQuestionModes(anime,format).length>0
     :format==='typed'||questionModeHasFourChoices(anime,mode);
    if(hasQuestion)eligible.push(anime);
   }
   if(limit<sourceLength){
    if(document.body.classList.contains('quiz-preparing')){
     const status=$('#quizStatus');
     if(status)status.textContent=lang==='ja'
      ?'出題候補を確認中… '+limit.toLocaleString()+' / '+sourceLength.toLocaleString()+'作品'
      :'Checking question candidates… '+limit+' / '+sourceLength;
    }
    // Yield regularly so rendering, input and image events can run between batches.
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }
  if(pool===sourcePool&&pool.length===sourceLength&&difficultyStatsRevision===sourceRevision){
   eligibleCandidateCache.set(key,eligible);
   while(eligibleCandidateCache.size>12)eligibleCandidateCache.delete(eligibleCandidateCache.keys().next().value);
  }
  return eligible;
 })();
 const buildRecord={pool:sourcePool,length:sourceLength,revision:sourceRevision,promise:build};
 eligibleCandidateBuilds.set(key,buildRecord);
 try{return await build}
 finally{if(eligibleCandidateBuilds.get(key)===buildRecord)eligibleCandidateBuilds.delete(key)}
}
let eligibleCandidatePrewarmToken=0;
function scheduleEligibleCandidatePrewarm(){
 if(!pool.length||document.body.classList.contains('quiz-active'))return;
 const token=++eligibleCandidatePrewarmToken;
 const run=()=>{
  if(token!==eligibleCandidatePrewarmToken||!pool.length||document.body.classList.contains('quiz-active'))return;
  playMode=$('#playMode')?.value||playMode;
  const mode=$('#modeSelect')?.value||'mixed';
  const format=(playMode==='daily'||playMode==='rush')?'choices':($('#answerFormatSelect')?.value||'choices');
  // Prepare expensive catalogue indexes while the page is idle, so the
  // Start button can reuse the completed work instead of building it on click.
  prepareDifficultyTiers(pool);
  getEligibleCandidatePoolAsync(mode,format).catch(error=>console.warn('Candidate prewarm deferred:',error));
 };
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:100});
 else setTimeout(run,100);
}
let aqwPreparationStageLog=[];
async function aqwMeasurePreparationStage(name,task){
 const startedAt=performance.now();
 try{return await task()}
 finally{
  const durationMs=Math.round((performance.now()-startedAt)*10)/10;
  aqwPreparationStageLog.push({stage:name,durationMs});
  window.__aqwQuizPreparationStages=aqwPreparationStageLog.slice();
 }
}
async function collectEligibleAnime(mode,format,target,ignoreDifficulty=false){
 const sourcePool=pool,key=eligibleCandidateCacheKey(mode,format,ignoreDifficulty),cached=eligibleCandidateCache.get(key);
 const candidates=[...(cached||sourcePool)],eligible=[],startedAt=performance.now();
 if(!cached&&!['image','titleStudio'].includes(mode))await ensureQuestionChoiceSummaryAsync();
 for(let i=0;i<candidates.length&&eligible.length<target;i++){
  const j=i+randomInt(candidates.length-i);[candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  const anime=candidates[i];
  if(!cached){
   if(pool!==sourcePool)return [];
   if(!isEligibleBaseAnime(anime,mode,format))continue;
   if(!ignoreDifficulty&&!matchesDifficulty(anime,format,mode))continue;
   if(format==='typed'&&!typedTitleEligible(anime))continue;
   const hasQuestion=mode==='mixed'?hasAnyQuestionMode(anime,format):format==='typed'||questionModeHasFourChoices(anime,mode);
   if(!hasQuestion)continue;
  }
  eligible.push(anime);
  if((i+1)%24===0&&i+1<candidates.length&&eligible.length<target){
   const status=$('#quizStatus');
   if(status)status.textContent=lang==='ja'?'出題候補を確認中… '+(i+1).toLocaleString()+' / '+candidates.length.toLocaleString()+'作品':'Checking candidates… '+(i+1)+' / '+candidates.length;
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 window.__aqwLastCandidateSelectionMs=Math.round(performance.now()-startedAt);
 aqwPreparationStageLog.push({stage:'候補の抽出・シャッフル',durationMs:window.__aqwLastCandidateSelectionMs});
 window.__aqwQuizPreparationStages=aqwPreparationStageLog.slice();
 return eligible;
}
async function begin(){
 if(quizStartInProgress||startRetryInProgress)return;
 questionAdvanceToken++;eligibleCandidatePrewarmToken++;
 document.body.classList.add('quiz-active','quiz-preparing');
 $('#quizHeader').classList.remove('hidden');$('#quizStatus').classList.remove('hidden');$('#animePoolProgress').classList.remove('hidden');
 $('#setupControls').classList.add('hidden');$('#start').classList.add('hidden');
 $('#quizStatus').textContent=lang==='ja'?'クイズ画面を準備しています…':'Preparing quiz screen…';
 $('#quizArea').classList.remove('hidden');$('#cover').classList.add('hidden');$('#answerPrompt').textContent=lang==='ja'?'問題を準備しています…':'Preparing your first question…';$('#answers').replaceChildren();$('#answers').classList.remove('hidden');$('#typedAnswerBox').classList.add('hidden');
 // Let the preparing screen paint before running candidate selection on the main thread.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(!pool.length){
  startRetryInProgress=true;
  const status=$('#quizStatus');
  status.textContent=lang==='ja'?'作品データを読み込んでいます。完了したらクイズを開始します。':'Loading anime data. The quiz will start when loading finishes.';
  $('#start').disabled=true;$('#start').textContent=tr('loading');
  try{
   // Reuse the page-start preload if it is already running; do not abandon the
   // click handler or leave the quiz screen stuck in its preparing state.
   await prepare();
  }catch(error){
   console.error('AQW automatic quiz data load failed.',error);
   $('#quizStatus').textContent=lang==='ja'?'作品データを読み込めませんでした。再試行してください。':'Could not load anime data. Please retry.';
  }finally{
   startRetryInProgress=false;
   $('#start').disabled=false;
  }
  if(!pool.length){
   document.body.classList.remove('quiz-active','quiz-preparing');
   $('#setupControls').classList.remove('hidden');$('#quizArea').classList.add('hidden');
   $('#quitQuizButton').classList.add('hidden');
   $('#start').classList.remove('hidden');$('#start').textContent=tr('retry');
   return;
  }
 }
 quizStartInProgress=true;$('#start').disabled=true;quizFinished=false;
 const quizPreparationStartedAt=performance.now();
 aqwPreparationStageLog=[];
 window.__aqwQuizPreparationStages=[];
 try{
  clearInterval(questionTimer);clearInterval(clockTimer);skippedQuestionCount=0;$('#quitQuizButton').classList.remove('hidden');$('#setupControls').classList.add('hidden');$('#result').classList.add('hidden');reviewMode=false;missedQuestions=[];questionAttemptResults=[];roundFailed=false;playMode=$('#playMode').value;mixedModeCounts={};adaptiveDifficultyOverride=calculatePersonalDifficultyOverride();if(typeof window.aqwEnsureSupabaseFeatures==='function'){Promise.resolve().then(()=>window.aqwEnsureSupabaseFeatures()).then(()=>typeof window.aqwLoadPersonalDifficultyProfile==='function'?window.aqwLoadPersonalDifficultyProfile():null).then(()=>{if($('#quizArea').classList.contains('hidden'))adaptiveDifficultyOverride=calculatePersonalDifficultyOverride()}).catch(error=>console.warn('Optional AQW services could not be initialized:',error))}await aqwMeasurePreparationStage('個人別難易度計算',async()=>{adaptiveDifficultyOverride=calculatePersonalDifficultyOverride()});let mode=$('#modeSelect').value;if(mode!=='titleStudio')await aqwMeasurePreparationStage('問題候補データ構築',()=>ensureQuestionChoiceSummaryAsync());await aqwMeasurePreparationStage('難易度データ準備',async()=>{prepareDifficultyTiers(pool)});
  const format=(playMode==='daily'||playMode==='rush')?'choices':$('#answerFormatSelect').value;
  requestedQuestionCount=playMode==='endless'?Infinity:(playMode==='daily'||playMode==='rush')?10:Math.min(10000,Math.max(1,Math.floor(Number($('#questionCount').value)||10)));
  const target=playMode==='endless'?Infinity:requestedQuestionCount;
  const eligible=await collectEligibleAnime(mode,format,target);
   if(!eligible.length){document.body.classList.remove('quiz-active','quiz-preparing');clearInterval(questionTimer);clearInterval(clockTimer);locked=true;questions=[];index=0;$('#quizArea').classList.add('hidden');$('#quitQuizButton').classList.add('hidden');$('#setupControls').classList.remove('hidden');$('#start').classList.remove('hidden');$('#start').disabled=false;$('#start').textContent=tr('start');$('#quizStatus').textContent=lang==='ja'?'この形式で出題できる作品がありません。出題形式や難易度を変更してください。':'No anime are available for this format. Change the question type or difficulty.';return}
  const ordered=playMode==='daily'?dailyOrder(eligible):shuffle(eligible),count=(playMode==='daily'||playMode==='rush')?Math.min(10,ordered.length):playMode==='endless'?ordered.length:Math.min(requestedQuestionCount,ordered.length);
  questions=ordered.slice(0,count);index=0;points=0;combo=0;bestCombo=0;choiceHintUsed=false;typedHintUsed=false;elapsedSeconds=0;startedAt=Date.now();
  $('#score').textContent=tr('score')+' 0';$('#quizArea').classList.remove('hidden');$('#start').classList.add('hidden');
  window.__aqwLastQuizPreparationMs=Math.round(performance.now()-quizPreparationStartedAt);
  console.info('[AQW performance] quiz preparation', {totalMs:window.__aqwLastQuizPreparationMs,stages:window.__aqwQuizPreparationStages,candidateSelectionMs:window.__aqwLastCandidateSelectionMs??null,candidateCount:eligible.length,questionCount:questions.length,mode,format});
  clockTimer=setInterval(()=>{elapsedSeconds=Math.floor((Date.now()-startedAt)/1000);$('#elapsedLabel').textContent=({ja:'経過時間：',en:'Elapsed: ',ko:'경과 시간: ',zh:'已用时间：',es:'Tiempo transcurrido: ',fr:'Temps écoulé : ',pt:'Tempo decorrido: ',de:'Verstrichene Zeit: '}[lang]||'Elapsed: ')+elapsedSeconds+({ja:'秒',en:'s',ko:'초',zh:'秒',es:' s',fr:' s',pt:' s',de:' s'}[lang]||'s')},250);
  showQuestion();
 }catch(error){console.error('AQW quiz start failed.',error);document.body.classList.remove('quiz-active','quiz-preparing');clearInterval(questionTimer);clearInterval(clockTimer);clearTimeout(autoNextTimer);autoNextTimer=null;locked=true;$('#quitQuizButton').classList.add('hidden');$('#quizArea').classList.add('hidden');$('#setupControls').classList.remove('hidden');$('#start').classList.remove('hidden');$('#start').textContent=tr('start');$('#quizStatus').textContent=lang==='ja'?'問題の準備中にエラーが発生しました：'+String(error?.message||error)+'。ページを再読み込みして再試行してください。':'Could not prepare questions: '+String(error?.message||error)+'. Reload the page and try again.'}
 finally{quizStartInProgress=false;$('#start').disabled=false}
}
let currentQuestionMode='image',correctAnswer='',answerInputActive=false,lastCorrectOptionIndex=-1,mixedModeCounts={};

function qText(key){const d={
ja:{image:'この作品のタイトルは？',year:'公開・放送開始年が「{v}」の作品は？',studio:'制作スタジオ「{v}」が担当した作品は？',studioUnknown:'制作スタジオが不明な作品です。タイトルを選んでください。',alias:'「{v}」と呼ばれる作品は？',titleYear:'の公開／放送開始年は？',titleStudio:'の制作スタジオは？',synopsis:'次のあらすじに該当する作品は？',titleSynopsis:'のあらすじは？',titleEpisodes:'は全何話？',titleGenre:'のジャンルに含まれるものは？',titleFormat:'の作品形式は？',unknown:'不明'},
en:{image:'Which anime is shown?',year:'Which anime was released or broadcast in this year?',studio:'Which anime was produced by “{v}”?',studioUnknown:'Studio unknown. Choose the title.',alias:'Which anime is also known as “{v}”?',titleYear:' — what year was it released or broadcast?',titleStudio:' — which studio produced it?',synopsis:'Which anime matches this synopsis?',titleSynopsis:' — what is its synopsis?',titleEpisodes:' — how many episodes does it have?',titleGenre:' — which of these is one of its genres?',titleFormat:' — what is its format?',unknown:'Unknown'},
ko:{image:'이 이미지에 나온 애니메이션은 무엇인가요?',year:'이 해에 공개되거나 방영된 애니메이션은 무엇인가요?',studio:'{v}에서 제작한 애니메이션은 무엇인가요?',studioUnknown:'제작사를 알 수 없습니다. 제목을 선택하세요.',alias:'“{v}”라고도 불리는 애니메이션은 무엇인가요?',titleYear:'의 공개·방영 연도는?',titleStudio:'의 제작 스튜디오는?',synopsis:'이 줄거리에 해당하는 애니메이션은 무엇인가요?',titleSynopsis:'의 줄거리는 무엇인가요?',titleEpisodes:'의 총 에피소드 수는?',titleGenre:'의 장르에 포함되는 것은?',titleFormat:'의 작품 형식은?',unknown:'알 수 없음'},
zh:{image:'这张图片中的动画作品是什么？',year:'哪部动画在这一年上映或播出？',studio:'这部动画由哪家公司制作？',studioUnknown:'制作公司未知。请选择作品标题。',alias:'也被称为“{v}”的动画是哪部？',titleYear:'的上映／播出年份是什么？',titleStudio:'的制作公司是什么？',synopsis:'哪部动画与这段简介相符？',titleSynopsis:'的剧情简介是什么？',titleEpisodes:'共有多少集？',titleGenre:'属于它的一个类型是什么？',titleFormat:'作品形式是什么？',unknown:'未知'},
es:{image:'¿Qué anime aparece en la imagen?',year:'¿Qué anime se estrenó o emitió en este año?',studio:'¿Qué estudio produjo este anime?',studioUnknown:'Estudio desconocido. Elige el título.',alias:'¿Qué anime también se conoce como «{v}»?',titleYear:' — ¿en qué año se estrenó o emitió?',titleStudio:' — ¿qué estudio lo produjo?',synopsis:'¿Qué anime coincide con esta sinopsis?',titleSynopsis:' — ¿cuál es su sinopsis?',titleEpisodes:' — ¿cuántos episodios tiene?',titleGenre:' — ¿cuál de estos es uno de sus géneros?',titleFormat:' — ¿cuál es su formato?',unknown:'Desconocido'},
fr:{image:'Quel anime apparaît sur cette image ?',year:'Quel anime est sorti ou a été diffusé cette année-là ?',studio:'Quel studio a produit cet anime ?',studioUnknown:'Studio inconnu. Choisissez le titre.',alias:'Quel anime est aussi connu sous le nom « {v} » ?',titleYear:' — en quelle année est-il sorti ou a-t-il été diffusé ?',titleStudio:' — quel studio l’a produit ?',synopsis:'Quel anime correspond à ce résumé ?',titleSynopsis:' — quel est son résumé ?',titleEpisodes:' — combien d’épisodes compte-t-il ?',titleGenre:' — lequel de ces genres lui correspond ?',titleFormat:' — quel est son format ?',unknown:'Inconnu'},
pt:{image:'Que anime aparece nesta imagem?',year:'Que anime foi lançado ou transmitido neste ano?',studio:'Qual estúdio produziu este anime?',studioUnknown:'Estúdio desconhecido. Escolha o título.',alias:'Que anime também é conhecido como “{v}”?',titleYear:' — em que ano foi lançado ou transmitido?',titleStudio:' — que estúdio o produziu?',synopsis:'Que anime corresponde a esta sinopse?',titleSynopsis:' — qual é a sua sinopse?',titleEpisodes:' — quantos episódios tem?',titleGenre:' — qual destes é um dos seus gêneros?',titleFormat:' — qual é o seu formato?',unknown:'Desconhecido'},
de:{image:'Welcher Anime ist auf diesem Bild zu sehen?',year:'Welcher Anime wurde in diesem Jahr veröffentlicht oder ausgestrahlt?',studio:'Welcher Anime wurde von {v} produziert?',studioUnknown:'Studio unbekannt. Wähle den Titel.',alias:'Welcher Anime ist auch als „{v}“ bekannt?',titleYear:' — in welchem Jahr wurde er veröffentlicht oder ausgestrahlt?',titleStudio:' — welches Studio produzierte ihn?',synopsis:'Welcher Anime passt zu dieser Zusammenfassung?',titleSynopsis:' — wie lautet die Zusammenfassung?',titleEpisodes:' — wie viele Folgen hat er?',titleGenre:' — welches davon ist eines seiner Genres?',titleFormat:' — welches Format hat er?',unknown:'Unbekannt'}
};
const CORE_TRANSLATIONS={
ko:{countLabel:'문제 수',reviewMissed:'틀린 문제 복습',bestRecord:'최고 기록',runs:'플레이 횟수',welcome:'먼저 표시 언어를 선택하세요.',choose:'언어 선택',quizHeading:'애니메이션 퀴즈',loading:'불러오는 중…',answerPrompt:'정답을 선택하세요.',start:'퀴즈 시작',retry:'다시 시도',next:'다음 문제',placeholder:'애니메이션 제목 검색',preparing:'문제를 준비하는 중…',score:'점수',loaded:'작품을 불러왔습니다.',loadError:'데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.',correct:'정답!',right:'정답',finish:'결과 보기',completed:'완료',searching:'검색 중…',notFound:'검색 결과가 없습니다.',items:'개 작품',apiError:'데이터 서비스 연결 오류'},
zh:{countLabel:'题目数量',reviewMissed:'复习错题',bestRecord:'最佳成绩',runs:'游玩次数',welcome:'请先选择显示语言。',choose:'选择语言',quizHeading:'动漫问答',loading:'正在加载…',answerPrompt:'请选择答案。',start:'开始答题',retry:'重试',next:'下一题',placeholder:'搜索动漫名称',preparing:'正在准备题目…',score:'得分',loaded:'作品已加载。',loadError:'无法加载数据，请稍后重试。',correct:'回答正确！',right:'正确',finish:'查看结果',completed:'已完成',searching:'搜索中…',notFound:'没有找到结果。',items:'部作品',apiError:'数据服务连接错误'},
es:{countLabel:'Número de preguntas',reviewMissed:'Repasar preguntas falladas',bestRecord:'Mejor resultado',runs:'Partidas jugadas',welcome:'Primero, selecciona el idioma.',choose:'Elegir idioma',quizHeading:'Quiz de anime',loading:'Cargando…',answerPrompt:'Selecciona una respuesta.',start:'Iniciar quiz',retry:'Intentar de nuevo',next:'Siguiente pregunta',placeholder:'Buscar título de anime',preparing:'Preparando preguntas…',score:'Puntuación',loaded:'Obras cargadas.',loadError:'No se pudieron cargar los datos. Inténtalo más tarde.',correct:'¡Correcto!',right:'Correcto',finish:'Ver resultados',completed:'Completado',searching:'Buscando…',notFound:'No se encontraron resultados.',items:' títulos',apiError:'Error de conexión con el servicio de datos'},
fr:{countLabel:'Nombre de questions',reviewMissed:'Revoir les questions ratées',bestRecord:'Meilleur résultat',runs:'Parties jouées',welcome:'Choisissez d’abord la langue d’affichage.',choose:'Choisir la langue',quizHeading:'Quiz anime',loading:'Chargement…',answerPrompt:'Choisissez une réponse.',start:'Commencer le quiz',retry:'Réessayer',next:'Question suivante',placeholder:'Rechercher un titre d’anime',preparing:'Préparation des questions…',score:'Score',loaded:'Œuvres chargées.',loadError:'Impossible de charger les données. Réessayez plus tard.',correct:'Bonne réponse !',right:'Correct',finish:'Voir les résultats',completed:'Terminé',searching:'Recherche…',notFound:'Aucun résultat trouvé.',items:' titres',apiError:'Erreur de connexion au service de données'},
pt:{countLabel:'Número de perguntas',reviewMissed:'Rever perguntas erradas',bestRecord:'Melhor resultado',runs:'Partidas jogadas',welcome:'Primeiro, selecione o idioma.',choose:'Selecionar idioma',quizHeading:'Quiz de anime',loading:'Carregando…',answerPrompt:'Selecione uma resposta.',start:'Iniciar quiz',retry:'Tentar novamente',next:'Próxima pergunta',placeholder:'Pesquisar título de anime',preparing:'Preparando perguntas…',score:'Pontuação',loaded:'Obras carregadas.',loadError:'Não foi possível carregar os dados. Tente novamente mais tarde.',correct:'Correto!',right:'Correto',finish:'Ver resultados',completed:'Concluído',searching:'Pesquisando…',notFound:'Nenhum resultado encontrado.',items:' títulos',apiError:'Erro de conexão com o serviço de dados'},
de:{countLabel:'Anzahl der Fragen',reviewMissed:'Falsch beantwortete Fragen wiederholen',bestRecord:'Bestes Ergebnis',runs:'Gespielte Runden',welcome:'Wähle zuerst die Anzeigesprache.',choose:'Sprache auswählen',quizHeading:'Anime-Quiz',loading:'Wird geladen…',answerPrompt:'Wähle eine Antwort.',start:'Quiz starten',retry:'Erneut versuchen',next:'Nächste Frage',placeholder:'Anime-Titel suchen',preparing:'Fragen werden vorbereitet…',score:'Punktzahl',loaded:'Titel geladen.',loadError:'Daten konnten nicht geladen werden. Bitte später erneut versuchen.',correct:'Richtig!',right:'Richtig',finish:'Ergebnisse anzeigen',completed:'Abgeschlossen',searching:'Suche…',notFound:'Keine Ergebnisse gefunden.',items:' Titel',apiError:'Verbindungsfehler beim Datendienst'}
};
Object.keys(CORE_TRANSLATIONS).forEach(code=>Object.assign(T[code]||(T[code]={}),CORE_TRANSLATIONS[code]));
return ((d[lang]||d.en)[key]||(d.en[key]||key))}
function skipBrokenImageQuestion(brokenUrl=''){if(brokenUrl){failedImageUrls.add(String(brokenUrl));questionChoiceSummaryCache=null;}const current=questions[index];if(current){const image=current.coverImage?.large||current.coverImage?.medium||current.coverImage?.extraLarge||'';if(image&&failedImageUrls.has(image))pool=pool.filter(item=>Number(item.id)!==Number(current.id));}if(locked)return;locked=true;clearTimeout(autoNextTimer);autoNextTimer=null;skippedQuestionCount++;clearInterval(questionTimer);const cover=$('#cover');if(cover){cover.classList.add('hidden');cover.removeAttribute('src')}$('#feedback').textContent=({ja:'画像を読み込めなかったため、この問題をスキップしました。',en:'This question was skipped because its image could not be loaded.',ko:'이미지를 불러오지 못해 이 문제를 건너뛰었습니다.',zh:'由于图片无法加载，已跳过此题。',es:'Se omitió esta pregunta porque no se pudo cargar la imagen.',fr:'Cette question a été ignorée car son image n’a pas pu être chargée.',pt:'Esta pergunta foi ignorada porque não foi possível carregar a imagem.',de:'Diese Frage wurde übersprungen, da das Bild nicht geladen werden konnte.'}[lang]||'This question was skipped because its image could not be loaded.');$('#next').textContent=tr('next');$('#next').classList.remove('hidden');$('#answers').querySelectorAll('button.answer').forEach(button=>button.disabled=true);$('#typedAnswer').disabled=true;$('#submitTypedAnswer').disabled=true;clearTimeout(autoNextTimer);autoNextTimer=setTimeout(()=>$('#next').click(),220)}
function preloadNextQuestionImage(){const next=questions[index+1];if(!next)return;const url=next?.coverImage?.medium||next?.coverImage?.large||next?.coverImage?.extraLarge||'';if(!url||failedImageUrls.has(url)||questionImagePreloadCache.has(url))return;const image=new Image();image.decoding='async';image.fetchPriority='low';image.src=url;questionImagePreloadCache.set(url,image);if(questionImagePreloadCache.size>12){const oldest=questionImagePreloadCache.keys().next().value;questionImagePreloadCache.delete(oldest)}}
function showQuestionInternal(preserveMode=false){clearTimeout(autoNextTimer);autoNextTimer=null;clearInterval(questionTimer);locked=false;choiceHintUsed=false;typedHintUsed=false;$('#answerPrompt').style.whiteSpace='normal';$('#answerPrompt').style.padding='0';$('#answerPrompt').style.background='transparent';$('#answerPrompt').style.borderRadius='0';const a=questions[index],mode=$('#modeSelect').value;const quizCover=$('#cover');quizCover.decoding='async';quizCover.fetchPriority='high';quizCover.onload=()=>quizCover.classList.remove('image-loading');quizCover.classList.add('image-loading');quizCover.onerror=()=>{quizCover.classList.remove('image-loading');const brokenUrl=quizCover.currentSrc||quizCover.src;[quizCover.currentSrc,quizCover.src].filter(Boolean).forEach(url=>failedImageUrls.add(url));quizCover.classList.add('hidden');if(['image','character','characterImage','titleCharacter'].includes(currentQuestionMode))skipBrokenImageQuestion(brokenUrl)};$('#progress').textContent=(index+1)+' / '+questions.length;$('#quizProgressBar').style.width=(index/questions.length*100)+'%';$('#comboBadge').textContent=({ja:'連続正解 ',en:'Combo ',ko:'연속 정답 ',zh:'连续答对 ',es:'Racha ',fr:'Série ',pt:'Sequência ',de:'Serie '}[lang]||'Combo ')+combo;$('#comboBadge').classList.toggle('combo-hot',combo>=3);$('#hintBadge').textContent=({ja:'ヒント 1回',en:'Hint: 1',ko:'힌트 1회',zh:'提示：1次',es:'Pista: 1',fr:'Indice : 1',pt:'Dica: 1',de:'Hinweis: 1'}[lang]||'Hint: 1');$('#hintButton').disabled=false;$('#typedHintButton').disabled=false;const hintLabels={ja:['四択用ヒント','入力用ヒント'],en:['Multiple-choice hint','Typing hint'],ko:['객관식 힌트','입력 힌트'],zh:['四选一提示','输入提示'],es:['Pista para opciones','Pista para escribir'],fr:['Indice pour QCM','Indice de saisie'],pt:['Dica para múltipla escolha','Dica para digitação'],de:['Multiple-Choice-Hinweis','Eingabehinweis']};$('#hintButton').textContent=(hintLabels[lang]||hintLabels.en)[0];$('#typedHintButton').textContent=(hintLabels[lang]||hintLabels.en)[1];const coverUrl=a?.coverImage?.extraLarge||a?.coverImage?.large||a?.coverImage?.medium||'';$('#cover').removeAttribute('src');$('#cover').alt='';$('#cover').classList.add('hidden');$('#feedback').textContent='';$('#next').classList.add('hidden');const typingOnly=playMode!=='daily'&&playMode!=='rush'&&$('#answerFormatSelect').value==='typed';let modesForFormat=availableQuestionModes(a,$('#answerFormatSelect').value);let selectedMode=mode==='mixed'?(preserveMode&&modesForFormat.includes(currentQuestionMode)?currentQuestionMode:(()=>{const minCount=Math.min(...modesForFormat.map(m=>mixedModeCounts[m]||0));const balancedModes=modesForFormat.filter(m=>(mixedModeCounts[m]||0)===minCount);return shuffle(balancedModes)[0]||'image'})()):mode;let actualMode=selectedMode;if(actualMode==='image'&&coverUrl){$('#cover').src=coverUrl;$('#cover').alt=titleOf(a)+tr('titleAlt')}$('#cover').classList.toggle('hidden',!coverUrl||!['image'].includes(actualMode));let prompt='',correct='',opts=[];
if(actualMode==='image'){if(!titleImageIsSafe(a))throw new Error(lang==='ja'?'利用可能な作品画像がありません。':'No usable artwork is available.');prompt=qText('image');correct=titleOf(a);opts=makeTitleOptions(a)}


if(actualMode==='synonym'){const syn=shuffle(uniqueAliasCandidates(a))[0];prompt=syn?qText('alias').replace('{v}',syn):qText('image');correct=titleOf(a);opts=makeTitleOptions(a)}
if(actualMode==='titleYear'){prompt='「'+titleOf(a)+'」'+qText('titleYear');correct=String(animeYear(a));opts=makeYearOptions(a)}

if(actualMode==='studio'){const studio=String(a?.studios?.nodes?.[0]?.name||'');prompt=qText('studio').replace('{v}',studio);correct=titleOf(a);opts=makeStudioTitleOptions(a);$('#cover').classList.add('hidden')}
if(actualMode==='year'){const year=animeYear(a);prompt=qText('year').replace('{v}',String(year));correct=titleOf(a);opts=makeYearTitleOptions(a);$('#cover').classList.add('hidden')}
if(actualMode==='titleStudio'){prompt='「'+titleOf(a)+'」'+qText('titleStudio');correct=String(a.studios?.nodes?.[0]?.name||'');opts=makeStudioOptions(a);$('#cover').classList.add('hidden')}
if(actualMode==='character'){const summary=questionChoiceSummary();const characterRecord=shuffle(characterRecords([a]).filter(record=>isSingleAnimeCharacter(record,summary)))[0]||null;const character=characterDisplayName(characterRecord);prompt=({ja:'このキャラクターが登場する作品は？',en:'Which anime features this character?',ko:'이 캐릭터가 등장하는 애니메이션은 무엇인가요?',zh:'这名角色出现在哪部动画中？',es:'¿En qué anime aparece este personaje?',fr:'Dans quel anime apparaît ce personnage ?',pt:'Em qual anime este personagem aparece?',de:'In welchem Anime kommt diese Figur vor?'}[lang]||'Which anime features this character?')+'\n'+character;correct=titleOf(a);opts=makeTitleOptions(a);const characterImage=characterRecord?.image||'';$('#cover').src=characterImage;$('#cover').alt=character;$('#cover').classList.toggle('hidden',!characterImage)}
if(actualMode==='characterImage'){const characterRecord=shuffle(characterRecordsWithFourChoicesForAnime(a))[0];if(characterRecord){const name=characterRecord.name;prompt=({ja:'このキャラクターの名前は？',en:'What is this character’s name?',ko:'이 캐릭터의 이름은?',zh:'这个角色的名字是什么？',es:'¿Cómo se llama este personaje?',fr:'Quel est le nom de ce personnage ?',pt:'Qual é o nome deste personagem?',de:'Wie heißt diese Figur?'}[lang]||'What is this character’s name?');correct=name;opts=characterChoiceOptions({id:Number(characterRecord.id)||0,name,image:characterRecord.image,animeId:characterRecord.animeId},false);$('#cover').src=characterRecord.image;$('#cover').alt=name;$('#cover').classList.remove('hidden')}};if(actualMode==='characterNameImage'){const characterRecord=shuffle(characterRecordsWithFourChoicesForAnime(a,questionChoiceSummary(),true))[0];if(characterRecord){const name=characterRecord.name;prompt=({ja:'このキャラクターの画像を選んでください：',en:'Choose the image of this character:',ko:'이 캐릭터의 이미지를 선택하세요:',zh:'请选择这个角色的图片：',es:'Elige la imagen de este personaje:',fr:'Choisissez l’image de ce personnage :',pt:'Escolha a imagem deste personagem:',de:'Wähle das Bild dieser Figur:'}[lang]||'Choose the image of this character:')+'\n'+name;correct=name;opts=characterChoiceOptions({id:Number(characterRecord.id)||0,name,image:characterRecord.image,animeId:characterRecord.animeId},true);$('#cover').classList.add('hidden')}};if(actualMode==='titleCharacter'){const characterRecord=shuffle(characterRecordsWithFourTitleChoicesForAnime(a))[0]||null;correct=characterRecord?.name||'';prompt=titleOf(a)+({ja:'に登場するこのキャラクターの名前は？',en:' — what is this character’s name?',ko:'에 등장하는 이 캐릭터의 이름은?',zh:'中这个角色的名字是什么？',es:' — ¿cómo se llama este personaje?',fr:' — quel est le nom de ce personnage ?',pt:' — qual é o nome deste personagem?',de:' — wie heißt diese Figur?'}[lang]||' — what is this character’s name?');opts=titleCharacterChoiceRecordsForAnime(a,characterRecord);$('#cover').src=characterRecord?.image||'';$('#cover').alt=characterRecord?.name||titleOf(a);$('#cover').classList.toggle('hidden',!characterRecord?.image)}
if(actualMode==='synopsis'){prompt=qText('synopsis')+'\n\n'+synopsisText(a);$('#cover').classList.add('hidden');$('#answerPrompt').style.whiteSpace='pre-line';$('#answerPrompt').style.padding='16px';$('#answerPrompt').style.background='#f0f2f5';$('#answerPrompt').style.borderRadius='6px';correct=synopsisJapaneseAnswerTitle(a);opts=makeSynopsisOptions(a,true)}
if(actualMode==='titleSynopsis'){prompt='「'+titleOf(a)+'」'+qText('titleSynopsis');$('#cover').classList.add('hidden');correct=descriptionOf(a);opts=makeSynopsisOptions(a,false)}
if(actualMode==='titleEpisodes'){prompt='「'+titleOf(a)+'」'+qText('titleEpisodes');correct=String(a.episodes);opts=shuffle(episodeChoiceRecordsForAnime(a))}
if(actualMode==='titleGenre'){const genreOptions=genreChoiceRecordsForAnime(a),correctGenre=genreOptions[0];prompt='「'+titleOf(a)+'」'+qText('titleGenre');correct=correctGenre?.value||'';opts=shuffle(genreOptions)}
if(actualMode==='titleFormat'){const formatOptions=formatChoiceRecordsForAnime(a),correctFormat=formatOptions[0];prompt='「'+titleOf(a)+'」'+qText('titleFormat');correct=correctFormat?.value||'';opts=shuffle(formatOptions)}


if(!typingOnly&&opts.length<4&&titleImageIsSafe(a)&&!['titleYear','titleStudio','synonym','synopsis','titleSynopsis','titleEpisodes','titleGenre','titleFormat','studio','year'].includes(actualMode)){
 // Keep studio/alias questions in their selected mode; their answer is still an anime title,
 // so the shared title-choice recovery below can safely complete their distractor set.
 actualMode='image';prompt=qText('image');correct=titleOf(a);opts=makeTitleOptions(a);
 const fallbackCover=a?.coverImage?.large||a?.coverImage?.medium||a?.coverImage?.extraLarge||'';
 $('#cover').src=fallbackCover;$('#cover').alt=titleOf(a)+tr('titleAlt');$('#cover').classList.toggle('hidden',!fallbackCover);
}
if(!typingOnly&&opts.length<4&&['image','synonym','character'].includes(actualMode)){
 const seen=new Set(opts.map(option=>normalizeAnswer(typeof option==='string'?option:option?.value))),usedAliases=new Set(titleAnswerVariants(a).map(normalizeAnswer).filter(Boolean));
 for(const option of opts){const matched=pool.find(item=>Number(item.id)===Number(option?.mediaId));if(matched)for(const alias of titleAnswerVariants(matched).map(normalizeAnswer).filter(Boolean))usedAliases.add(alias)}
 for(const item of shuffle(pool)){
  if(opts.length>=4)break;
  if(Number(item.id)===Number(a.id))continue;
  const title=titleOf(item),key=normalizeAnswer(title);
  if(!title||!key||seen.has(key)||titleChoiceAliasesConflict(usedAliases,item))continue;
  seen.add(key);for(const alias of titleAnswerVariants(item).map(normalizeAnswer).filter(Boolean))usedAliases.add(alias);opts.push({label:title,value:title,mediaId:Number(item.id)});
 }
}
if(!typingOnly&&opts.length<4)throw new Error('Four unique answer choices could not be prepared.');
if(!quizCover.getAttribute('src')||(quizCover.complete&&quizCover.naturalWidth>0))quizCover.classList.remove('image-loading');// Balance by the selected mode, but log the mode actually shown after any fallback.
if(mode==='mixed')mixedModeCounts[selectedMode]=(mixedModeCounts[selectedMode]||0)+1;currentQuestionMode=actualMode;correctAnswer=correct;$('#answerPrompt').textContent=prompt;if($('#answerFormatSelect').value==='typed'&&!['titleYear','titleStudio','titleCharacter','titleSynopsis','synopsis'].includes(actualMode)){const note=({ja:'※ 劇場版・映画・シーズン（第2期など）の表記は入力不要です。作品名の基本部分だけ入力してください。',en:'Note: You do not need to type “Movie/The Movie” or season labels (e.g. Season 2). Enter the base title only.',ko:'※ 극장판·영화·시즌(예: 2기) 표기는 입력하지 않아도 됩니다. 기본 작품명만 입력하세요.',zh:'※ 无需输入剧场版、电影或季数（如第2季）标记，只需输入基本作品名。',es:'Nota: no hace falta escribir “película” ni la temporada (p. ej., temporada 2). Escribe solo el título base.',fr:'Remarque : inutile de saisir « film » ou la saison (ex. saison 2). Saisissez uniquement le titre de base.',pt:'Nota: não é necessário digitar “filme” nem a temporada (ex.: temporada 2). Digite apenas o título base.',de:'Hinweis: „Film“ und Staffelnummer (z. B. Staffel 2) müssen nicht eingegeben werden. Der Grundtitel genügt.'}[lang]||'Note: Movie and season labels are optional; enter the base title only.');$('#answerPrompt').textContent+='\n'+note;$('#answerPrompt').style.whiteSpace='pre-line'}$('#answers').replaceChildren();$('#typedAnswerBox').classList.toggle('hidden',!typingOnly);$('#typedAnswer').value='';$('#typedAnswer').disabled=false;$('#submitTypedAnswer').disabled=false;answerInputActive=typingOnly;const canToggleInput=false;$('#toggleAnswerMode').classList.add('hidden');$('#toggleAnswerMode').disabled=true;$('#toggleAnswerMode').textContent=answerModeLabel(answerInputActive);$('#hintButton').classList.toggle('hidden',typingOnly);$('#typedHintButton').classList.toggle('hidden',!typingOnly);$('#hintButton').disabled=false;$('#typedHintButton').disabled=false;if(!typingOnly){const correctKey=normalizeAnswer(correct);const fixed=[];const seen=new Set();if(correct&&correctKey){fixed.push({label:correct,value:correct,mediaId:Number(a.id)});seen.add(correctKey)}for(const raw of opts){const o=typeof raw==='string'?{label:raw,value:raw}:raw;const key=o&&o.value!=null?normalizeAnswer(o.value):'';if(o&&o.label!=null&&o.value!=null&&key&&!seen.has(key)){seen.add(key);fixed.push(o)}}for(const item of shuffle(difficultyDistractors(a.id))){if(fixed.length>=4)break;if(Number(item.id)===Number(a.id)||!titleUsable(item))continue;const title=titleOf(item),key=normalizeAnswer(title);if(title&&key&&!seen.has(key)){seen.add(key);fixed.push({label:title,value:title,mediaId:Number(item.id)})}}if(['characterImage','characterNameImage'].includes(actualMode)){opts=shuffle(opts).slice(0,4)}else{const correctOption=fixed.find(o=>normalizeAnswer(o.value)===correctKey)||{label:correct,value:correct,mediaId:Number(a.id)};const distractors=shuffle(fixed.filter(o=>normalizeAnswer(o.value)!==correctKey)).slice(0,3);opts=shuffle([...distractors,correctOption])}}opts.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='answer';if(o.image){b.classList.add('character-image-answer');const img=document.createElement('img');img.src=o.image;img.alt=String(o.label??'');img.loading='lazy';img.onerror=()=>{const brokenUrls=[img.currentSrc,img.src].filter(Boolean);brokenUrls.forEach(url=>failedImageUrls.add(url));pool=pool.filter(item=>!characterRecords([item]).some(record=>brokenUrls.includes(record.image)));b.remove();skipBrokenImageQuestion(brokenUrls[0]||'')};b.setAttribute('aria-label',String(o.label??o.value??''));b.append(img)}else b.textContent=String(o.label??o.value??'');b.dataset.value=String(o.value);b.dataset.mediaId=o.mediaId==null?'':String(o.mediaId);b.onclick=()=>choose(b,o.value,correct,o.mediaId==null?{}:{selectedId:Number(o.mediaId),correctId:Number(a.id)});$('#answers').append(b)});if(typingOnly){$('#answers').classList.add('hidden');$('#typedAnswerBox').classList.remove('hidden');$('#typedAnswerBox').style.display='block';$('#typedAnswer').disabled=false;$('#submitTypedAnswer').disabled=false;$('#typedAnswer').placeholder=({ja:'答えを入力してください',en:'Type your answer',ko:'정답을 입력하세요',zh:'请输入答案',es:'Escribe tu respuesta',fr:'Saisissez votre réponse',pt:'Digite sua resposta',de:'Antwort eingeben'}[lang]||'Type your answer');$('#typedAnswer').style.pointerEvents='auto';$('#typedAnswer').readOnly=false}else{$('#answers').classList.remove('hidden');$('#answers').style.display='grid';$('#typedAnswerBox').classList.add('hidden');$('#typedAnswerBox').style.display='none'}startQuestionTimer();preloadNextQuestionImage()}
function answerModeLabel(inputActive){const labels={ja:{input:'入力で回答する',choices:'選択肢で回答する'},en:{input:'Answer by typing',choices:'Use choices'},ko:{input:'직접 입력으로 답하기',choices:'선택지로 답하기'},zh:{input:'输入答案',choices:'使用选项回答'},es:{input:'Responder escribiendo',choices:'Usar opciones'},fr:{input:'Répondre en saisissant',choices:'Utiliser les choix'},pt:{input:'Responder digitando',choices:'Usar opções'},de:{input:'Antwort eingeben',choices:'Antwort auswählen'}};return (labels[lang]||labels.en)[inputActive?'choices':'input']}
$('#toggleAnswerMode').onclick=()=>{if(locked||$('#toggleAnswerMode').disabled)return;answerInputActive=!answerInputActive;$('#answers').classList.toggle('hidden',answerInputActive);$('#typedAnswerBox').classList.toggle('hidden',!answerInputActive);$('#hintButton').classList.toggle('hidden',answerInputActive);$('#toggleAnswerMode').textContent=answerModeLabel(answerInputActive);if(answerInputActive)$('#typedAnswer').focus()};$('#submitTypedAnswer').onclick=()=>{if(locked)return;const input=$('#typedAnswer');input.disabled=false;const value=input.value;if(!value.trim()){ $('#feedback').textContent=({ja:'回答を入力してください。',en:'Please enter an answer.',ko:'답을 입력해 주세요.',zh:'请输入答案。',es:'Escribe una respuesta.',fr:'Veuillez saisir une réponse.',pt:'Digite uma resposta.',de:'Bitte gib eine Antwort ein.'}[lang]||'Please enter an answer.');return}choose(null,value,correctAnswer,{typed:true,anime:questions[index],mode:currentQuestionMode})};$('#typedAnswer').addEventListener('keydown',e=>{if(e.key==='Enter')$('#submitTypedAnswer').click()});$('#typedUnknownAnswer').onclick=()=>{if(locked)return;choose(null,'__unknown__',correctAnswer,{typed:true,anime:questions[index],mode:currentQuestionMode})};
$('#hintButton').onclick=()=>{if(locked||choiceHintUsed)return;choiceHintUsed=true;$('#hintButton').disabled=true;$('#hintBadge').textContent=({ja:'四択ヒント使用済み',en:'Choice hint used',ko:'객관식 힌트 사용됨',zh:'已使用四选一提示',es:'Pista de opciones usada',fr:'Indice QCM utilisé',pt:'Dica de opções usada',de:'Multiple-Choice-Hinweis verwendet'}[lang]||'Choice hint used');const wrong=[...$('#answers').children].filter(b=>normalizeAnswer(b.dataset.value)!==normalizeAnswer(correctAnswer));shuffle(wrong).slice(0,Math.min(2,wrong.length)).forEach(b=>{b.disabled=true;b.style.opacity='.25';b.style.textDecoration='line-through'});$('#feedback').textContent=({ja:'四択用ヒント：選択肢を2つ除外しました。',en:'Multiple-choice hint: two options eliminated.',ko:'객관식 힌트: 선택지 두 개를 제외했습니다.',zh:'四选一提示：已排除两个选项。',es:'Pista: se eliminaron dos opciones.',fr:'Indice : deux choix ont été éliminés.',pt:'Dica: duas opções foram eliminadas.',de:'Hinweis: Zwei Optionen wurden ausgeschlossen.'}[lang]||'Two options eliminated.')};$('#typedHintButton').onclick=()=>{if(locked||typedHintUsed)return;typedHintUsed=true;$('#typedHintButton').disabled=true;$('#hintBadge').textContent=({ja:'入力ヒント使用済み',en:'Typing hint used',ko:'입력 힌트 사용됨',zh:'已使用输入提示',es:'Pista de escritura usada',fr:'Indice de saisie utilisé',pt:'Dica de digitação usada',de:'Eingabehinweis verwendet'}[lang]||'Typing hint used');const answer=String(correctAnswer??'').trim();const first=[...answer][0]||'';const length=[...answer].length;const hintText=({ja:'入力用ヒント：最初の文字「'+first+'」、文字数 '+length+'',en:'Typing hint: first character “'+first+'”, '+length+' characters.',ko:'입력 힌트: 첫 글자 “'+first+'”, 총 '+length+'자.',zh:'输入提示：首字为“'+first+'”，共 '+length+' 个字符。',es:'Pista: primera letra “'+first+'”, '+length+' caracteres.',fr:'Indice : première lettre « '+first+' », '+length+' caractères.',pt:'Dica: primeiro caractere “'+first+'”, '+length+' caracteres.',de:'Hinweis: erster Buchstabe „'+first+'“, '+length+' Zeichen.'}[lang]||'First character: '+first+'; length: '+length);$('#feedback').textContent=hintText};
function selectedQuestionTimeLimit(){if(playMode==='rush')return 5;const select=$('#timeLimitSelect');const value=Number(select?.value);return Number.isFinite(value)&&value>=5?value:15}
function startQuestionTimer(resumeSeconds=null){clearInterval(questionTimer);const limit=resumeSeconds==null?selectedQuestionTimeLimit():Math.max(1,resumeSeconds);questionDeadline=Date.now()+limit*1000;secondsLeft=limit;updateTimer();questionTimer=setInterval(()=>{const remaining=Math.max(0,Math.ceil((questionDeadline-Date.now())/1000));if(remaining!==secondsLeft){secondsLeft=remaining;updateTimer()}if(remaining===0){clearInterval(questionTimer);if(!locked)choose(null,'__timeout__',correctAnswer,{timeout:true})}},250)}
function showQuestion(preserveMode=false){try{document.body.classList.remove('quiz-preparing');$('#quitQuizButton').classList.remove('hidden');showQuestionInternal(preserveMode);const typed=playMode!=='daily'&&playMode!=='rush'&&$('#answerFormatSelect').value==='typed',answers=$('#answers'),box=$('#typedAnswerBox'),input=$('#typedAnswer'),submit=$('#submitTypedAnswer');$('#quizArea').classList.remove('hidden');$('#quizArea').style.setProperty('display','grid','important');if(typed){answers.classList.add('hidden');answers.style.setProperty('display','none','important');box.classList.remove('hidden');box.style.setProperty('display','block','important');box.style.setProperty('visibility','visible','important');input.classList.remove('hidden');input.disabled=false;input.readOnly=false;input.style.setProperty('display','block','important');input.style.setProperty('visibility','visible','important');input.style.setProperty('width','100%','important');input.style.setProperty('min-height','44px','important');submit.classList.remove('hidden');submit.disabled=false;submit.style.setProperty('display','inline-block','important');}else{box.classList.add('hidden');box.style.setProperty('display','none','important');answers.classList.remove('hidden');answers.style.setProperty('display','grid','important');answers.style.setProperty('visibility','visible','important');answers.style.setProperty('grid-template-columns','repeat(2,minmax(0,1fr))','important');answers.style.setProperty('gap','10px','important');for(const button of answers.querySelectorAll('button.answer')){button.classList.remove('hidden');button.style.setProperty('display','block','important');button.style.setProperty('visibility','visible','important');button.style.setProperty('width','100%','important')}if(answers.querySelectorAll('button.answer').length!==4)throw new Error('選択肢を4つ用意できません。出題形式を変更してください。');}return}catch(error){
 console.error('AQW showQuestion failed.',error?.stack||String(error));
 clearInterval(questionTimer);
 clearTimeout(autoNextTimer);
 autoNextTimer=null;
 locked=false;
 const a=questions[index];
 const safeTitle=item=>{try{return String(titleOf(item)||'')}catch(e){const t=item?.title||{};return String(t.native||t.romaji||t.english||t.userPreferred||'作品名不明')}};
 const correct=safeTitle(a);
 if(!a||!correct||correct==='作品名不明'){
  locked=true;skippedQuestionCount++;
  $('#feedback').textContent=lang==='ja'?'問題データを読み込めなかったため、この問題をスキップします。':'This question was skipped because its data could not be loaded.';
  $('#next').classList.remove('hidden');
  $('#next').textContent=tr('next');
  autoNextTimer=setTimeout(()=>$('#next').click(),300);
  return;
 }
 correctAnswer=correct;
 currentQuestionMode='image';
 const typed=playMode!=='daily'&&playMode!=='rush'&&$('#answerFormatSelect').value==='typed';
 const cover=$('#cover');
 cover.classList.add('hidden');
 cover.removeAttribute('src');
 cover.alt='';
 $('#quizArea').classList.remove('hidden');
 $('#quizArea').style.setProperty('display','grid','important');
 $('#quizArea').style.setProperty('visibility','visible','important');
 $('#answerPrompt').textContent=({ja:'この作品のタイトルは？',en:'What is the title of this anime?',ko:'이 작품의 제목은 무엇인가요?',zh:'这部作品的标题是什么？',es:'¿Cuál es el título de este anime?',fr:'Quel est le titre de cet anime ?',pt:'Qual é o título deste anime?',de:'Wie lautet der Titel dieses Anime?'}[lang]||'What is the title of this anime?');
 $('#feedback').textContent='';
 $('#next').classList.add('hidden');
 $('#answers').replaceChildren();
 $('#typedAnswer').value='';
 $('#typedAnswer').disabled=false;
 $('#submitTypedAnswer').disabled=false;
 const typedBox=$('#typedAnswerBox'),typedInput=$('#typedAnswer'),typedSubmit=$('#submitTypedAnswer');
 typedBox.classList.toggle('hidden',!typed);
 typedBox.style.setProperty('display',typed?'block':'none','important');
 typedBox.style.setProperty('visibility',typed?'visible':'hidden','important');
 typedInput.classList.toggle('hidden',!typed);
 typedInput.disabled=false;typedInput.readOnly=false;
 typedInput.style.setProperty('display',typed?'block':'none','important');
 typedInput.style.setProperty('visibility',typed?'visible':'hidden','important');
 typedInput.style.setProperty('width','100%','important');
 typedInput.style.setProperty('min-height','44px','important');
 typedSubmit.classList.toggle('hidden',!typed);
 typedSubmit.disabled=false;
 typedSubmit.style.setProperty('display',typed?'inline-block':'none','important');
 $('#answers').classList.toggle('hidden',typed);
 $('#answers').style.setProperty('display',typed?'none':'grid','important');
 $('#answers').style.setProperty('visibility',typed?'hidden':'visible','important');
 $('#hintButton').classList.toggle('hidden',typed);
 $('#typedHintButton').classList.toggle('hidden',!typed);
 if(!typed){
  const options=[],used=new Set();
  const addOption=item=>{
   const value=safeTitle(item),key=normalizeAnswer(value);
   if(!value||!key||used.has(key))return;
   used.add(key);options.push({item,value});
  };
  addOption(a);
  for(const item of shuffle(pool)){if(options.length>=4)break;if(Number(item?.id)!==Number(a.id))addOption(item)}
  if(options.length<4){
   locked=true;skippedQuestionCount++;
   $('#feedback').textContent=lang==='ja'?'選択肢を4つ用意できないため、この問題をスキップします。':'This question was skipped because four answer choices were unavailable.';
   $('#next').classList.remove('hidden');
   $('#next').textContent=tr('next');
   autoNextTimer=setTimeout(()=>$('#next').click(),300);
   return;
  }
  for(const option of shuffle(options)){
   const button=document.createElement('button');
   button.type='button';button.className='answer';button.textContent=option.value;
   button.dataset.value=option.value;button.dataset.mediaId=String(option.item.id??'');
   button.onclick=()=>choose(button,option.value,correct);
   $('#answers').append(button);
  }
  $('#answers').classList.remove('hidden');
  $('#answers').style.setProperty('display','grid','important');
  $('#answers').style.setProperty('visibility','visible','important');
  $('#answers').style.setProperty('grid-template-columns','repeat(2,minmax(0,1fr))','important');
  $('#answers').style.setProperty('gap','10px','important');
  for(const button of $('#answers').querySelectorAll('button.answer')){
   button.classList.remove('hidden');button.disabled=false;
   button.style.setProperty('display','block','important');
   button.style.setProperty('visibility','visible','important');
   button.style.setProperty('width','100%','important');
  }
 }else{
  $('#typedAnswer').placeholder=({ja:'答えを入力してください',en:'Type your answer',ko:'정답을 입력하세요',zh:'请输入答案',es:'Escribe tu respuesta',fr:'Saisissez votre réponse',pt:'Digite sua resposta',de:'Antwort eingeben'}[lang]||'Type your answer');
  $('#typedAnswer').readOnly=false;
  $('#typedAnswer').style.pointerEvents='auto';
 }
 
 $('#quitQuizButton').classList.remove('hidden');
 
 
 $('#progress').textContent=(index+1)+' / '+questions.length;
 $('#quizProgressBar').style.width=(index/questions.length*100)+'%';
 $('#comboBadge').textContent=(lang==='ja'?'連続正解 ':'Combo ')+combo;
 $('#hintBadge').classList.remove('hidden');
 startQuestionTimer();
}}function updateTimer(){$('#timerLabel').textContent=({ja:'残り時間：',en:'Time left: ',ko:'남은 시간: ',zh:'剩余时间：',es:'Tiempo restante: ',fr:'Temps restant : ',pt:'Tempo restante: ',de:'Verbleibende Zeit: '}[lang]||'Time left: ')+secondsLeft+({ja:'秒',en:'s',ko:'초',zh:'秒',es:' s',fr:' s',pt:' s',de:' s'}[lang]||'s')}
function choose(btn,value,correct,meta={}){if(locked)return;locked=true;clearInterval(questionTimer);const buttons=[...$('#answers').children];buttons.forEach(b=>{b.disabled=true;if(meta.correctId!=null?Number(b.dataset.mediaId)===Number(meta.correctId):b.dataset.value===String(correct))b.classList.add('correct')});const isCorrect=meta.typed?answersMatch(value,meta.anime,meta.mode,correct):(meta.selectedId!=null&&meta.correctId!=null?Number(meta.selectedId)===Number(meta.correctId):value===correct);const answeredAnime=questions[index];if(playMode!=='review'&&answeredAnime&&Number.isSafeInteger(Number(answeredAnime.id))&&Number(answeredAnime.id)>0)questionAttemptResults.push({animeId:Number(answeredAnime.id),questionMode:currentQuestionMode,correct:isCorrect});if(isCorrect){points++;combo++;bestCombo=Math.max(bestCombo,combo);if(btn)btn.classList.add('correct');$('#feedback').textContent=(combo>=3?({ja:'正解！ '+combo+'連続正解！',en:'Correct! '+combo+' combo!',ko:'정답! '+combo+'연속 정답!',zh:'答对了！连续答对 '+combo+' 题！',es:'¡Correcto! Racha de '+combo,fr:'Correct ! Série de '+combo,pt:'Correto! Sequência de '+combo,de:'Richtig! '+combo+' in Folge!'}[lang]||'Correct! '+combo+' combo!'):tr('correct'));$('#feedback').style.color='var(--good)'}else{combo=0;$('#comboBadge').textContent=({ja:'連続正解 ',en:'Combo ',ko:'연속 정답 ',zh:'连续答对 ',es:'Racha ',fr:'Série ',pt:'Sequência ',de:'Serie '}[lang]||'Combo ')+combo;$('#comboBadge').classList.remove('combo-hot');missedQuestions.push(questions[index]);if(btn)btn.classList.add('wrong');const feedbackPrefix=value==='__unknown__'?({ja:'わからない。正解：',en:"You didn't know. Correct answer: ",ko:'모르겠어요. 정답: ',zh:'不知道。正确答案：',es:'No lo sabías. Respuesta correcta: ',fr:'Vous ne saviez pas. Bonne réponse : ',pt:'Você não sabia. Resposta correta: ',de:'Nicht gewusst. Richtige Antwort: '}[lang]||"You didn't know. Correct answer: "):(value==='__timeout__'?({ja:'時間切れ。不正解。正解：',en:'Time up. Correct answer: ',ko:'시간 초과. 오답입니다. 정답: ',zh:'时间到，答错了。正确答案：',es:'Tiempo agotado. Respuesta correcta: ',fr:'Temps écoulé. Bonne réponse : ',pt:'Tempo esgotado. Resposta correta: ',de:'Zeit abgelaufen. Richtige Antwort: '}[lang]||'Time up. Correct answer: '):({ja:'不正解。正解：',en:'Incorrect. Correct answer: ',ko:'오답입니다. 정답: ',zh:'回答错误。正确答案：',es:'Incorrecto. Respuesta correcta: ',fr:'Incorrect. Bonne réponse : ',pt:'Incorreto. Resposta correta: ',de:'Falsch. Richtige Antwort: '}[lang]||'Incorrect. Correct answer: '));$('#feedback').textContent=feedbackPrefix+correct;$('#feedback').style.color='var(--bad)'}$('#typedAnswer').disabled=true;$('#submitTypedAnswer').disabled=true;$('#toggleAnswerMode').disabled=true;$('#hintButton').disabled=true;$('#typedHintButton').disabled=true;$('#comboBadge').textContent=(lang==='ja'?'連続正解 ':'Combo ')+combo;$('#comboBadge').classList.toggle('combo-hot',combo>=3);$('#score').textContent=tr('score')+' '+points;$('#next').classList.remove('hidden');$('#next').textContent=(index===questions.length-1&&playMode!=='endless')?tr('finish'):tr('next');clearTimeout(autoNextTimer);autoNextTimer=setTimeout(()=>{if(!locked)return;$('#next').click()},120)}
$('#quitQuizButton').addEventListener('click',()=>{const messages={ja:'クイズを終了して最初の画面に戻りますか？\n今回のプレイ記録は保存されません。',en:'Quit the quiz and return to the start screen?\nThis attempt will not be saved.',ko:'퀴즈를 종료하고 시작 화면으로 돌아갈까요?\n이번 플레이 기록은 저장되지 않습니다.',zh:'要结束答题并返回开始页面吗？\n本次记录不会保存。',es:'¿Salir del cuestionario y volver al inicio?\nEsta partida no se guardará.',fr:'Quitter le quiz et revenir à l’écran de départ ?\nCette tentative ne sera pas enregistrée.',pt:'Sair do quiz e voltar ao início?\nEsta tentativa não será salva.',de:'Quiz beenden und zum Startbildschirm zurückkehren?\nDieser Versuch wird nicht gespeichert.'};if(window.confirm(messages[lang]||messages.en))goHome()});$('#start').onclick=begin;$('#restart').onclick=begin;$('#homeAfterQuiz').onclick=goHome;const refreshCandidatePrewarm=()=>{playMode=$('#playMode')?.value||playMode;adaptiveDifficultyOverride=calculatePersonalDifficultyOverride();scheduleEligibleCandidatePrewarm()};$('#modeSelect').addEventListener('change',()=>{updateDifficultyUI();refreshCandidatePrewarm()});$('#difficultySelect').addEventListener('change',()=>{if(!$('#quizArea').classList.contains('hidden'))goHome();updateDifficultyUI();refreshCandidatePrewarm()});$('#answerFormatSelect').addEventListener('change',refreshCandidatePrewarm);$('#playMode').addEventListener('change',refreshCandidatePrewarm);function finishQuiz(){if(quizFinished)return;quizFinished=true;questionAdvanceToken++;clearTimeout(autoNextTimer);autoNextTimer=null;$('#quizHeader').classList.add('hidden');$('#quizStatus').classList.add('hidden');$('#animePoolProgress').classList.add('hidden');clearInterval(questionTimer);clearInterval(clockTimer);elapsedSeconds=Math.floor((Date.now()-startedAt)/1000);$('#quitQuizButton').classList.add('hidden');$('#quizArea').classList.add('hidden');$('#setupControls').classList.add('hidden');$('#result').classList.remove('hidden');$('#restart').classList.remove('hidden');document.querySelector('.share-actions').classList.remove('hidden');$('#historySummary').classList.remove('hidden');const attemptedTotal=Math.min(playMode==='endless'?index+1:questions.length,questions.length);const total=Math.max(0,attemptedTotal-skippedQuestionCount);const accuracy=Math.round(points/Math.max(1,total)*100);let history=[];try{const savedHistory=JSON.parse(safeStorage.getItem('aqw-history')||'[]');history=Array.isArray(savedHistory)?savedHistory:[]}catch(error){console.warn('Invalid quiz history was ignored:',error)}const finishedAt=new Date();lastResultData={score:points,total,accuracy,seconds:elapsedSeconds,finishedAt:finishedAt.toISOString(),dateLabel:finishedAt.toLocaleString(lang==='ja'?'ja-JP':'en-US'),playMode,questionMode:$('#modeSelect').value,configuredCount:playMode==='endless'?questions.length:(playMode==='daily'||playMode==='rush')?10:(Number($('#questionCount').value)||10),questionTimeLimit:selectedQuestionTimeLimit(),runId:makeRunId()};history.push({score:points,total,accuracy,seconds:elapsedSeconds,date:lastResultData.finishedAt,mode:lastResultData.questionMode,playMode,runId:lastResultData.runId});safeStorage.setItem('aqw-history',JSON.stringify(history.slice(-30)));const bestKey='aqw-best-'+(playMode==='rush'?'rush':total);const best=Math.max(accuracy,Number(safeStorage.getItem(bestKey)||0));safeStorage.setItem(bestKey,String(best));const runs=Number(safeStorage.getItem('aqw-total-runs')||0)+1;safeStorage.setItem('aqw-total-runs',String(runs));const xpEarned=points*(playMode==='rush'?15:10);const xp=Number(safeStorage.getItem('aqw-xp')||0)+xpEarned;safeStorage.setItem('aqw-xp',String(xp));updateDailyProgress(points,playMode);if(playMode!=='review')window.dispatchEvent(new CustomEvent('aqw:quiz-finished',{detail:{runId:makeStatsRunId(),correctCount:points,questionCount:total,xpMultiplier:playMode==='rush'?15:10,questionResults:questionAttemptResults}}));if(playMode==='rush')window.dispatchEvent(new CustomEvent('aqw:rush-finished',{detail:{runId:makeStatsRunId(),correctCount:points,questionCount:total,elapsedMs:Math.max(1000,Date.now()-startedAt)}}));const resultFmt={ja:()=>total+'問中 '+points+'問正解（正答率 '+accuracy+'%）・所要時間 '+elapsedSeconds+'秒',en:()=>points+' of '+total+' correct (accuracy: '+accuracy+'%) · Time: '+elapsedSeconds+'s',ko:()=>total+'문제 중 '+points+'문제 정답 (정답률 '+accuracy+'%) · 소요 시간 '+elapsedSeconds+'초',zh:()=>total+'题中答对 '+points+'题（正确率 '+accuracy+'%）· 用时 '+elapsedSeconds+'秒',es:()=>points+' de '+total+' correctas (acierto: '+accuracy+'%) · Tiempo: '+elapsedSeconds+' s',fr:()=>points+' sur '+total+' bonnes réponses (précision : '+accuracy+' %) · Temps : '+elapsedSeconds+' s',pt:()=>points+' de '+total+' corretas (precisão: '+accuracy+'%) · Tempo: '+elapsedSeconds+' s',de:()=>points+' von '+total+' richtig (Trefferquote: '+accuracy+' %) · Zeit: '+elapsedSeconds+' s'};$('#resultText').textContent=(resultFmt[lang]||resultFmt.en)();if(playMode==='normal'&&Number(lastResultData.configuredCount)>attemptedTotal){const shortage=Number(lastResultData.configuredCount)-attemptedTotal;const notice=({ja:'\n\n※ 出題可能な作品が不足したため、設定した'+lastResultData.configuredCount+'問ではなく'+total+'問で終了しました（'+shortage+'問不足）。',en:'\n\nNote: The quiz ended with '+total+' questions instead of '+lastResultData.configuredCount+' because not enough eligible anime were available ('+shortage+' short).',ko:'\n\n※ 출제 가능한 작품이 부족해 설정한 '+lastResultData.configuredCount+'문제가 아닌 '+total+'문제로 종료했습니다.',zh:'\n\n※ 由于符合条件的作品不足，实际完成 '+total+' 题，而非设定的 '+lastResultData.configuredCount+' 题。',es:'\n\nNota: el cuestionario terminó con '+total+' preguntas en lugar de '+lastResultData.configuredCount+' por falta de anime disponibles.',fr:'\n\nNote : le quiz s’est terminé avec '+total+' questions au lieu de '+lastResultData.configuredCount+' faute d’animes éligibles.',pt:'\n\nNota: o quiz terminou com '+total+' perguntas em vez de '+lastResultData.configuredCount+' por falta de animes disponíveis.',de:'\n\nHinweis: Das Quiz endete wegen zu weniger geeigneter Anime mit '+total+' statt '+lastResultData.configuredCount+' Fragen.'}[lang]||'\n\nNote: Fewer eligible anime were available than requested.');$('#resultText').textContent+=notice}$('#historySummary').textContent=tr('bestRecord')+': '+best+'% · '+tr('runs')+': '+runs+' · XP: '+xp+' (+'+xpEarned+') · Level '+(Math.floor(xp/250)+1);$('#reviewMissed').textContent=tr('reviewMissed')+' ('+missedQuestions.length+')';$('#reviewMissed').classList.toggle('hidden',missedQuestions.length===0);$('#restart').textContent=tr('restart');const resultUi=LANG_UI[lang]||LANG_UI.en;$('#shareResult').textContent=resultUi.share||'Share result';$('#downloadResult').textContent=resultUi.download||'Save image';$('#progress').textContent=tr('completed');$('#quizProgressBar').style.width='100%';const rank=accuracy>=95?'S':accuracy>=80?'A':accuracy>=60?'B':accuracy>=40?'C':'D';const rankLabels={ja:['ランク ','最大連続正解 '],en:['Rank ','Best combo '],ko:['등급 ','최대 연속 정답 '],zh:['等级 ','最高连续答对 '],es:['Rango ','Mejor racha '],fr:['Rang ','Meilleure série '],pt:['Classificação ','Melhor sequência '],de:['Rang ','Beste Serie ']};const rankLabel=rankLabels[lang]||rankLabels.en;$('#resultText').textContent+=' · '+rankLabel[0]+rank+' · '+rankLabel[1]+bestCombo;$('#shareStatus').textContent=({ja:'画像にはプレイ形式・出題形式・問題数・制限時間・スコア・日時・結果コードを記載します。画像の編集自体を技術的に禁止することはできません。',en:'The card includes mode, question type, question count, time limit, score, date and result code. Image editing cannot be technically prevented.',ko:'결과 이미지에는 플레이 방식, 문제 유형, 문항 수, 제한 시간, 점수, 날짜 및 결과 코드가 표시됩니다. 이미지 편집 자체를 기술적으로 막을 수는 없습니다.',zh:'结果图片会显示游戏模式、题型、题目数量、时间限制、分数、日期和结果代码。技术上无法完全阻止图片被编辑。',es:'La tarjeta incluye modo, tipo de pregunta, número de preguntas, límite de tiempo, puntuación, fecha y código del resultado. No es posible impedir técnicamente la edición de la imagen.',fr:'La carte indique le mode, le type de question, le nombre de questions, la limite de temps, le score, la date et le code du résultat. Il est impossible d’empêcher techniquement la modification de l’image.',pt:'O cartão inclui modo, tipo de pergunta, número de perguntas, limite de tempo, pontuação, data e código do resultado. Não é possível impedir tecnicamente a edição da imagem.',de:'Die Karte enthält Modus, Fragetyp, Fragenanzahl, Zeitlimit, Punktzahl, Datum und Ergebniscodierung. Die Bearbeitung des Bildes lässt sich technisch nicht verhindern.'})[lang]||'The card includes mode, question type, question count, time limit, score, date and result code.';renderProgress();
 // Prepare the next round's question index while the result screen is visible.
 prewarmQuestionSummaryForRestart();
}
function makeStatsRunId(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})}
function makeRunId(){return 'AQW-'+dateKey().replaceAll('-','')+'-'+Math.random().toString(36).slice(2,8).toUpperCase()}
$('#next').onclick=()=>{if(!locked||$('#next').disabled)return;clearTimeout(autoNextTimer);autoNextTimer=null;const token=++questionAdvanceToken;const nextIndex=index+1,needsMore=playMode==='endless'||(playMode==='normal'&&questions.length<requestedQuestionCount);if(nextIndex>=questions.length&&needsMore&&backgroundLoadPromise){$('#next').disabled=true;$('#next').textContent=lang==='ja'?'作品データを追加中…':'Loading more anime…';const waitForNext=()=>{if(token!==questionAdvanceToken)return;if(index+1<questions.length){$('#next').disabled=false;index++;showQuestion();return}if(!backgroundLoadPromise){$('#next').disabled=false;finishQuiz();return}setTimeout(waitForNext,80)};waitForNext();return}index++;if(index>=questions.length){finishQuiz();return}showQuestion()};
$('#reviewMissed').onclick=()=>{if(!missedQuestions.length)return;quizFinished=false;questionAdvanceToken++;clearTimeout(autoNextTimer);autoNextTimer=null;clearInterval(questionTimer);clearInterval(clockTimer);questions=shuffle(missedQuestions);missedQuestions=[];reviewMode=true;playMode='review';roundFailed=false;index=0;points=0;skippedQuestionCount=0;combo=0;bestCombo=0;elapsedSeconds=0;startedAt=Date.now();$('#quitQuizButton').classList.remove('hidden');$('#result').classList.add('hidden');$('#setupControls').classList.add('hidden');$('#quizArea').classList.remove('hidden');$('#score').textContent=tr('score')+' 0';clockTimer=setInterval(()=>{elapsedSeconds=Math.floor((Date.now()-startedAt)/1000);$('#elapsedLabel').textContent=(lang==='ja'?'経過時間：':'Elapsed: ')+elapsedSeconds+(lang==='ja'?'秒':'s')},250);showQuestion()};
function resultLabels(d){const all={ja:{play:{normal:'通常クイズ',daily:'デイリーチャレンジ',endless:'エンドレス',rush:'スピードラッシュ',review:'間違えた問題の復習'},mode:{typed:'入力式クイズ',image:'作品ビジュアル → 作品名',synopsis:'あらすじ → 作品名',synonym:'略称・別名 → 作品名',studio:'制作スタジオ → 作品名',year:'公開／放送開始年 → 作品名',titleYear:'作品名 → 公開／放送開始年',titleStudio:'作品名 → 制作スタジオ',titleSynopsis:'作品名 → あらすじ',titleEpisodes:'作品名 → 話数',titleGenre:'作品名 → ジャンル',titleFormat:'作品名 → 作品形式',mixed:'ランダム出題'}},en:{play:{normal:'Normal quiz',daily:'Daily Challenge',endless:'Endless',rush:'Speed Rush',review:'Missed-question review'},mode:{typed:'Typed-answer quiz',image:'Artwork → Anime',synopsis:'Synopsis → Anime',synonym:'Alias → Anime',studio:'Studio → Anime',year:'Release/broadcast year → Anime',titleYear:'Anime → Release/broadcast year',titleStudio:'Anime → Studio',titleSynopsis:'Anime → Synopsis',titleEpisodes:'Anime → Episode count',titleGenre:'Anime → Genre',titleFormat:'Anime → Format',mixed:'Random'}},ko:{play:{normal:'일반 퀴즈',daily:'오늘의 도전',endless:'무한 모드',rush:'스피드 러시',review:'오답 복습'},mode:{typed:'직접 입력 퀴즈',image:'이미지 → 작품명',synopsis:'줄거리 → 작품명',synonym:'별칭 → 작품명',studio:'제작사 → 작품명',year:'공개·방영 연도 → 작품명',titleYear:'작품명 → 공개·방영 연도',titleStudio:'작품명 → 제작사',titleSynopsis:'작품명 → 줄거리',titleEpisodes:'작품명 → 에피소드 수',titleGenre:'작품명 → 장르',titleFormat:'작품명 → 형식',mixed:'무작위'}},zh:{play:{normal:'普通问答',daily:'每日挑战',endless:'无尽模式',rush:'极速挑战',review:'错题复习'},mode:{typed:'输入答案',image:'图片 → 作品名',synopsis:'简介 → 作品名',synonym:'别名 → 作品名',studio:'制作公司 → 作品名',year:'上映／播出年份 → 作品名',titleYear:'作品名 → 上映／播出年份',titleStudio:'作品名 → 制作公司',titleSynopsis:'作品名 → 简介',titleEpisodes:'作品名 → 集数',titleGenre:'作品名 → 类型',titleFormat:'作品名 → 形式',mixed:'随机出题'}},es:{play:{normal:'Quiz normal',daily:'Desafío diario',endless:'Modo infinito',rush:'Ráfaga rápida',review:'Repaso de errores'},mode:{typed:'Respuesta escrita',image:'Imagen → Anime',synopsis:'Sinopsis → Anime',synonym:'Alias → Anime',studio:'Estudio → Anime',year:'Año de estreno/emisión → Anime',titleYear:'Anime → Año de estreno/emisión',titleStudio:'Anime → Estudio',titleSynopsis:'Anime → Sinopsis',titleEpisodes:'Anime → Episodios',titleGenre:'Anime → Género',titleFormat:'Anime → Formato',mixed:'Aleatorio'}},fr:{play:{normal:'Quiz classique',daily:'Défi quotidien',endless:'Mode sans fin',rush:'Défi éclair',review:'Révision des erreurs'},mode:{typed:'Réponse écrite',image:'Image → Anime',synopsis:'Synopsis → Anime',synonym:'Alias → Anime',studio:'Studio → Anime',year:'Année de sortie/diffusion → Anime',titleYear:'Anime → Année de sortie/diffusion',titleStudio:'Anime → Studio',titleSynopsis:'Anime → Résumé',titleEpisodes:'Anime → Nombre d’épisodes',titleGenre:'Anime → Genre',titleFormat:'Anime → Format',mixed:'Aléatoire'}},pt:{play:{normal:'Quiz normal',daily:'Desafio diário',endless:'Modo infinito',rush:'Desafio relâmpago',review:'Revisão de erros'},mode:{typed:'Resposta digitada',image:'Imagem → Anime',synopsis:'Sinopse → Anime',synonym:'Apelido → Anime',studio:'Estúdio → Anime',year:'Ano de lançamento/transmissão → Anime',titleYear:'Anime → Ano de lançamento/transmissão',titleStudio:'Anime → Estúdio',titleSynopsis:'Anime → Sinopse',titleEpisodes:'Anime → Episódios',titleGenre:'Anime → Gênero',titleFormat:'Anime → Formato',mixed:'Aleatório'}},de:{play:{normal:'Normales Quiz',daily:'Tägliche Herausforderung',endless:'Endlosmodus',rush:'Speed-Rush',review:'Falsche Antworten wiederholen'},mode:{typed:'Antwort eintippen',image:'Bild → Anime',synopsis:'Zusammenfassung → Anime',synonym:'Alias → Anime',studio:'Studio → Anime',year:'Veröffentlichungs-/Ausstrahlungsjahr → Anime',titleYear:'Anime → Veröffentlichungs-/Ausstrahlungsjahr',titleStudio:'Anime → Studio',titleSynopsis:'Anime → Zusammenfassung',titleEpisodes:'Anime → Episodenanzahl',titleGenre:'Anime → Genre',titleFormat:'Anime → Format',mixed:'Zufällig'}}};const x=all[lang]||all.en;return {play:x.play[d.playMode]||d.playMode,mode:x.mode[d.questionMode]||d.questionMode}}function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.closePath()}
async function createResultImage(){if(!lastResultData)throw new Error(lang==='ja'?'共有できる結果がありません。':'No quiz result to share.');const d=lastResultData,L=resultLabels(d),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f6f8';ctx.fillRect(0,0,1200,1600);ctx.fillStyle='#fff';roundRect(ctx,56,56,1088,1488,28);ctx.fill();ctx.strokeStyle='#dfe3e8';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#315b9a';ctx.fillRect(56,56,1088,16);ctx.fillStyle='#20242b';ctx.font='bold 48px Arial,sans-serif';ctx.fillText('ANIME QUIZ WORLD',100,150);ctx.fillStyle='#68717d';ctx.font='28px Arial,sans-serif';ctx.fillText(lang==='ja'?'クイズ結果レポート':'QUIZ RESULT REPORT',100,205);ctx.fillStyle='#315b9a';ctx.font='bold 116px Arial,sans-serif';ctx.fillText(d.score+'/'+d.total,100,365);ctx.fillStyle='#20242b';ctx.font='bold 48px Arial,sans-serif';ctx.fillText((lang==='ja'?'正答率 ':'Accuracy ')+d.accuracy+'%',100,440);ctx.fillStyle='#e7edf6';roundRect(ctx,100,480,1000,18,9);ctx.fill();ctx.fillStyle='#315b9a';roundRect(ctx,100,480,1000*d.accuracy/100,18,9);ctx.fill();const rows=lang==='ja'?[['プレイ形式',L.play],['出題形式',L.mode],[d.playMode==='endless'?'出題候補数':'設定問題数',d.configuredCount+'問'],['今回の出題数',d.total+'問'],['1問あたりの制限時間',d.questionTimeLimit+'秒'],['所要時間',d.seconds+'秒'],['プレイ日時',d.dateLabel],['結果コード',d.runId]]:[['Play mode',L.play],['Question type',L.mode],[d.playMode==='endless'?'Available question pool':'Configured questions',String(d.configuredCount)],['Questions counted',String(d.total)],['Time limit per question',d.questionTimeLimit+' seconds'],['Elapsed time',d.seconds+' seconds'],['Played at',d.dateLabel],['Result code',d.runId]];let y=585;for(const row of rows){ctx.fillStyle='#68717d';ctx.font='26px Arial,sans-serif';ctx.fillText(row[0],100,y);ctx.fillStyle='#20242b';ctx.font='bold 29px Arial,sans-serif';let v=row[1];while(ctx.measureText(v).width>620&&v.length>5)v=v.slice(0,-2)+'…';ctx.fillText(v,475,y);ctx.strokeStyle='#e6e9ee';ctx.beginPath();ctx.moveTo(100,y+22);ctx.lineTo(1100,y+22);ctx.stroke();y+=100}ctx.fillStyle='#68717d';ctx.font='22px Arial,sans-serif';ctx.fillText(lang==='ja'?'この画像はブラウザ内で生成。結果コードはサーバー検証ではありません。':'Generated in-browser. Result code is not server verification.',100,1450);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'anime-quiz-result.png',{type:'image/png'})):reject(new Error('Image generation failed')),'image/png'))}
function shareText(){const d=lastResultData,L=resultLabels(d);return lang==='ja'?'Anime Quiz Worldでクイズに挑戦！\n結果：'+d.score+'/'+d.total+'問（正答率'+d.accuracy+'%）\nプレイ形式：'+L.play+'\n出題形式：'+L.mode+'\n設定問題数：'+d.configuredCount+'問／制限時間：1問'+d.questionTimeLimit+'秒\n所要時間：'+d.seconds+'秒\nプレイ日時：'+d.dateLabel+'\n結果コード：'+d.runId+'\n'+location.href:'I played Anime Quiz World!\nScore: '+d.score+'/'+d.total+' ('+d.accuracy+'%)\nMode: '+L.play+'\nQuestion type: '+L.mode+'\nConfigured questions: '+d.configuredCount+' · Time limit: '+d.questionTimeLimit+'s/question\nElapsed: '+d.seconds+'s\nPlayed at: '+d.dateLabel+'\nResult code: '+d.runId+'\n'+location.href}
$('#downloadResult').onclick=async()=>{let url='';try{const file=await createResultImage();if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Anime Quiz World'});$('#shareStatus').textContent=lang==='ja'?'共有メニューを開きました。「画像を保存」または「写真に保存」を選んでください。':'Share menu opened. Choose Save Image or Save to Photos.';return}url=URL.createObjectURL(file);const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(isIOS){const opened=window.open(url,'_blank');$('#shareStatus').textContent=lang==='ja'?'画像を新しいタブで開きました。画像を長押しして「写真に保存」または「画像を保存」を選んでください。':'Image opened in a new tab. Touch and hold it to save.';if(!opened)$('#shareStatus').textContent=lang==='ja'?'ポップアップがブロックされました。もう一度押すか、共有ボタンから「画像を保存」を選んでください。':'Pop-up blocked. Try again or use Share.';return}const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();$('#shareStatus').textContent=lang==='ja'?'結果画像のダウンロードを開始しました。':'Result image download started.';setTimeout(()=>URL.revokeObjectURL(url),10000)}catch(e){if(url)URL.revokeObjectURL(url);$('#shareStatus').textContent=(lang==='ja'?'画像を保存できませんでした：':'Could not save image: ')+(e?.message||String(e))}};
$('#shareResult').onclick=async()=>{try{const file=await createResultImage(),text=shareText();if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'Anime Quiz World',text,files:[file]});$('#shareStatus').textContent=lang==='ja'?'共有メニューを開きました。対応アプリを選んでください。':'Share sheet opened. Choose a supported app.';return}const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');$('#shareStatus').textContent=lang==='ja'?'画像を保存し、Xの投稿画面を開きました。ブラウザの制限により自動添付できないため、保存したPNGを手動で添付してください。':'Downloaded the image and opened X. Browser restrictions prevent auto-attachment here; attach the PNG manually.'}catch(e){if(e.name==='AbortError')return;$('#shareStatus').textContent=(lang==='ja'?'共有できませんでした：':'Could not share: ')+e.message}};
function updateDailyProgress(points,mode){const today=dateKey();let d={date:today,plays:0,correct:0,dailyDone:false};try{d=JSON.parse(safeStorage.getItem('aqw-daily-progress')||'null')||d}catch(e){}if(d.date!==today)d={date:today,plays:0,correct:0,dailyDone:false};d.plays++;d.correct+=points;if(mode==='daily')d.dailyDone=true;safeStorage.setItem('aqw-daily-progress',JSON.stringify(d));let st={last:'',count:0};try{st=JSON.parse(safeStorage.getItem('aqw-streak')||'null')||st}catch(e){}if(st.last!==today){const yesterday=dateKey(new Date(Date.now()-86400000));st.count=st.last===yesterday?st.count+1:1;st.last=today;safeStorage.setItem('aqw-streak',JSON.stringify(st))}}
function renderProgress(){
let xp=Number(safeStorage.getItem('aqw-xp')||0),runs=Number(safeStorage.getItem('aqw-total-runs')||0),st={count:0},d={plays:0,correct:0,dailyDone:false};
try{st=JSON.parse(safeStorage.getItem('aqw-streak')||'null')||st}catch(e){}
try{d=JSON.parse(safeStorage.getItem('aqw-daily-progress')||'null')||d}catch(e){}
if(d.date!==dateKey())d={plays:0,correct:0,dailyDone:false};
const today=dateKey();let claimState={date:today,claimed:[]};
try{claimState=JSON.parse(safeStorage.getItem('aqw-daily-quest-claims')||'null')||claimState}catch(e){}
if(claimState.date!==today)claimState={date:today,claimed:[]};
const L={
ja:{level:'レベル',xp:'経験値',runs:'プレイ回数',streak:'連続日数',play:'クイズを1回プレイ',correct:'今日10問正解',daily:'デイリーチャレンジを完了',complete:'達成：',progressing:'進行中：',progress:'進捗：',reward:'報酬',claim:'報酬を受け取る',claimed:'受取済み',notDone:'未達成',first:'初回プレイ',ten:'10回プレイ',fifty:'50回プレイ',level5:'レベル5',dailyAch:'デイリー完了',achieved:'達成：',locked:'未達成：',episodes:'話'},
en:{level:'Level',xp:'XP',runs:'Quizzes played',streak:'Day streak',play:'Play one quiz',correct:'Get 10 correct answers today',daily:'Complete the daily challenge',complete:'Complete: ',progressing:'In progress: ',progress:'Progress: ',reward:'Reward',claim:'Claim reward',claimed:'Claimed',notDone:'Not completed',first:'First quiz',ten:'Play 10 quizzes',fifty:'Play 50 quizzes',level5:'Reach level 5',dailyAch:'Complete daily challenge',achieved:'Unlocked: ',locked:'Locked: ',episodes:' eps'},
ko:{level:'레벨',xp:'경험치',runs:'퀴즈 플레이 횟수',streak:'연속 출석일',play:'퀴즈 1회 플레이',correct:'오늘 10문제 정답 맞히기',daily:'오늘의 챌린지 완료',complete:'달성: ',progressing:'진행 중: ',progress:'진행도: ',reward:'보상',claim:'보상 받기',claimed:'수령 완료',notDone:'미달성',first:'첫 퀴즈',ten:'퀴즈 10회 플레이',fifty:'퀴즈 50회 플레이',level5:'레벨 5 달성',dailyAch:'오늘의 챌린지 완료',achieved:'달성: ',locked:'잠김: ',episodes:'화'},
zh:{level:'等级',xp:'经验值',runs:'答题次数',streak:'连续天数',play:'完成一次答题',correct:'今天答对10题',daily:'完成每日挑战',complete:'已完成：',progressing:'进行中：',progress:'进度：',reward:'奖励',claim:'领取奖励',claimed:'已领取',notDone:'未完成',first:'首次答题',ten:'答题10次',fifty:'答题50次',level5:'达到5级',dailyAch:'完成每日挑战',achieved:'已解锁：',locked:'未解锁：',episodes:'集'},
es:{level:'Nivel',xp:'XP',runs:'Partidas',streak:'Racha de días',play:'Juega un cuestionario',correct:'Acierta 10 preguntas hoy',daily:'Completa el reto diario',complete:'Completado: ',progressing:'En progreso: ',progress:'Progreso: ',reward:'Recompensa',claim:'Reclamar recompensa',claimed:'Reclamada',notDone:'No completado',first:'Primer cuestionario',ten:'Juega 10 cuestionarios',fifty:'Juega 50 cuestionarios',level5:'Alcanza el nivel 5',dailyAch:'Completa el reto diario',achieved:'Desbloqueado: ',locked:'Bloqueado: ',episodes:' eps'},
fr:{level:'Niveau',xp:'XP',runs:'Parties jouées',streak:'Série de jours',play:'Jouer à un quiz',correct:'Répondre correctement à 10 questions aujourd’hui',daily:'Terminer le défi quotidien',complete:'Terminé : ',progressing:'En cours : ',progress:'Progression : ',reward:'Récompense',claim:'Récupérer la récompense',claimed:'Récupérée',notDone:'Non terminé',first:'Premier quiz',ten:'Jouer à 10 quiz',fifty:'Jouer à 50 quiz',level5:'Atteindre le niveau 5',dailyAch:'Terminer le défi quotidien',achieved:'Débloqué : ',locked:'Verrouillé : ',episodes:' ép.'},
pt:{level:'Nível',xp:'XP',runs:'Partidas jogadas',streak:'Sequência de dias',play:'Jogar um quiz',correct:'Acertar 10 perguntas hoje',daily:'Concluir o desafio diário',complete:'Concluído: ',progressing:'Em andamento: ',progress:'Progresso: ',reward:'Recompensa',claim:'Resgatar recompensa',claimed:'Resgatada',notDone:'Não concluído',first:'Primeiro quiz',ten:'Jogar 10 quizzes',fifty:'Jogar 50 quizzes',level5:'Alcançar o nível 5',dailyAch:'Concluir o desafio diário',achieved:'Desbloqueado: ',locked:'Bloqueado: ',episodes:' eps'},
de:{level:'Level',xp:'EP',runs:'Gespielte Quizrunden',streak:'Tages-Serie',play:'Ein Quiz spielen',correct:'Heute 10 Fragen richtig beantworten',daily:'Tägliche Herausforderung abschließen',complete:'Abgeschlossen: ',progressing:'In Bearbeitung: ',progress:'Fortschritt: ',reward:'Belohnung',claim:'Belohnung abholen',claimed:'Abgeholt',notDone:'Nicht abgeschlossen',first:'Erstes Quiz',ten:'10 Quizrunden spielen',fifty:'50 Quizrunden spielen',level5:'Level 5 erreichen',dailyAch:'Tägliche Herausforderung abschließen',achieved:'Freigeschaltet: ',locked:'Gesperrt: ',episodes:' Folgen'}
};
const t=L[lang]||L.en;
const stats=[[t.level,Math.floor(xp/250)+1],[t.xp,xp],[t.runs,runs],[t.streak,st.count||0]];
$('#playerStats').replaceChildren();
stats.forEach(([name,value])=>{const el=document.createElement('article');el.className='anime';el.style.padding='12px';const b=document.createElement('strong');b.textContent=name;const small=document.createElement('small');small.textContent=value;el.append(b,small);$('#playerStats').append(el)});
const missions=[{id:'play',name:t.play,progress:Math.min(d.plays,1),target:1,reward:20,done:d.plays>=1},{id:'correct',name:t.correct,progress:Math.min(d.correct,10),target:10,reward:30,done:d.correct>=10},{id:'daily',name:t.daily,progress:d.dailyDone?1:0,target:1,reward:50,done:!!d.dailyDone}];
$('#dailyMissions').replaceChildren();
missions.forEach(q=>{const el=document.createElement('article');el.className='anime';el.style.padding='12px';const b=document.createElement('strong');b.textContent=(q.done?t.complete:t.progressing)+q.name;const small=document.createElement('small');small.style.display='block';small.style.margin='6px 0';small.textContent=t.progress+q.progress+'/'+q.target+' · '+t.reward+' '+q.reward+' XP';const btn=document.createElement('button');btn.type='button';const claimed=claimState.claimed.includes(q.id);btn.textContent=claimed?t.claimed:q.done?t.claim:t.notDone;btn.disabled=!q.done||claimed;btn.onclick=()=>{let state={date:dateKey(),claimed:[]};try{state=JSON.parse(safeStorage.getItem('aqw-daily-quest-claims')||'null')||state}catch(e){}if(state.date!==dateKey())state={date:dateKey(),claimed:[]};if(state.claimed.includes(q.id))return;state.claimed.push(q.id);safeStorage.setItem('aqw-daily-quest-claims',JSON.stringify(state));safeStorage.setItem('aqw-xp',String(Number(safeStorage.getItem('aqw-xp')||0)+q.reward));renderProgress()};el.append(b,small,btn);$('#dailyMissions').append(el)});
const achievements=[[t.first,runs>=1],[t.ten,runs>=10],[t.fifty,runs>=50],[t.level5,Math.floor(xp/250)+1>=5],[t.dailyAch,!!d.dailyDone]];
$('#achievements').replaceChildren();
achievements.forEach(([name,done])=>{const el=document.createElement('article');el.className='anime';el.style.padding='12px';el.textContent=(done?t.achieved:t.locked)+name;$('#achievements').append(el)});
}
// Return to the main quiz screen from any section.
function goHome(){
 questionAdvanceToken++;
 clearTimeout(autoNextTimer);autoNextTimer=null;
 document.body.classList.remove('quiz-active','quiz-preparing');
 clearInterval(questionTimer);
 clearInterval(clockTimer);
 
 
 const quitButton=document.getElementById('quitQuizButton');if(quitButton)quitButton.classList.add('hidden');
 
 
 // Abandon the active attempt without recording it as a completed run.
 locked=true;
 questions=[];
 index=0;
 points=0;
 combo=0;
 bestCombo=0;
 missedQuestions=[];
 reviewMode=false;
 roundFailed=false;
 choiceHintUsed=false;
 typedHintUsed=false;
 elapsedSeconds=0;
 startedAt=0;
 lastResultData=null;
 correctAnswer='';
 currentQuestionMode='image';
 const quizArea=document.getElementById('quizArea');
 const setupControls=document.getElementById('setupControls');
 const result=document.getElementById('result');
 // Remove the !important inline display overrides applied while rendering a question.
 // Otherwise the .hidden class may not hide the quiz area after returning home.
 ['quizArea','answers','typedAnswerBox','typedAnswer','submitTypedAnswer','result'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el)return;
  el.style.removeProperty('display');
  el.style.removeProperty('visibility');
  el.style.removeProperty('grid-template-columns');
  el.style.removeProperty('gap');
 });
 if(quizArea)quizArea.classList.add('hidden');
 if(setupControls)setupControls.classList.remove('hidden');
 if(result)result.classList.add('hidden');
 const answerPrompt=document.getElementById('answerPrompt');
 if(answerPrompt){answerPrompt.textContent='';answerPrompt.style.removeProperty('white-space');answerPrompt.style.removeProperty('padding');answerPrompt.style.removeProperty('background');answerPrompt.style.removeProperty('border-radius')}
 const cover=document.getElementById('cover');
 if(cover){cover.removeAttribute('src');cover.alt='';cover.classList.add('hidden')}
 const typedAnswer=document.getElementById('typedAnswer');
 if(typedAnswer){typedAnswer.value='';typedAnswer.disabled=false}
 const typedHintButton=document.getElementById('typedHintButton');
 if(typedHintButton){typedHintButton.disabled=false;typedHintButton.textContent=({ja:'入力用ヒント',en:'Typing hint',ko:'입력 힌트',zh:'输入提示',es:'Pista para escribir',fr:'Indice de saisie',pt:'Dica para digitação',de:'Eingabehinweis'}[lang]||'Typing hint')}
 const hintButton=document.getElementById('hintButton');
 if(hintButton)hintButton.disabled=false;
 const timer=document.getElementById('timer');
 if(timer)timer.textContent='';
 const comboBadge=document.getElementById('comboBadge');
 if(comboBadge)comboBadge.textContent='';
 const hintBadge=document.getElementById('hintBadge');
 if(hintBadge)hintBadge.textContent='';
 const quizStatus=document.getElementById('quizStatus');
 if(quizStatus)quizStatus.textContent='';
 const typedUnknownAnswer=document.getElementById('typedUnknownAnswer');
 if(typedUnknownAnswer)typedUnknownAnswer.disabled=false;
 const typedBox=document.getElementById('typedAnswerBox');
 if(typedBox)typedBox.classList.add('hidden');
 const answersPanel=document.getElementById('answers');
 if(answersPanel)answersPanel.classList.add('hidden');
 const startButton=document.getElementById('start');
 if(startButton){startButton.classList.remove('hidden');startButton.disabled=false;startButton.textContent=tr('start')}
 const score=document.getElementById('score');
 if(score)score.textContent=tr('score')+' 0';
 const progress=document.getElementById('progress');
 if(progress)progress.textContent='0 / 0';
 const progressBar=document.getElementById('quizProgressBar');
 if(progressBar)progressBar.style.width='0%';
 const feedback=document.getElementById('feedback');
 if(feedback)feedback.textContent='';
 const next=document.getElementById('next');
 if(next)next.classList.add('hidden');
 const answers=document.getElementById('answers');
 if(answers)answers.replaceChildren();
 const tabs=[...document.querySelectorAll('.tab')];
 tabs.forEach(tab=>{const active=tab.dataset.tab==='quiz';tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active))});
 const panels={quiz:document.getElementById('quiz'),search:document.getElementById('search'),progressTab:document.getElementById('progressPanel'),social:document.getElementById('social'),ranking:document.getElementById('ranking')};
 Object.entries(panels).forEach(([key,panel])=>{if(panel)panel.classList.toggle('hidden',key!=='quiz')});
 try{applyLanguage()}catch(error){console.error('AQW home screen refresh failed:',error)}
 window.scrollTo({top:0,behavior:'smooth'});
}
document.getElementById('homeLogo')?.addEventListener('click',goHome);
// Bind primary navigation before asynchronous startup so one startup error cannot disable the other tabs.
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',e=>{
 e.preventDefault();
 const tab=b.dataset.tab;
 document.querySelectorAll('.tab').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b))});
 const panels={quiz:$('#quiz'),search:$('#search'),progressTab:$('#progressPanel'),social:$('#social'),ranking:$('#ranking')};
 Object.entries(panels).forEach(([key,panel])=>{if(panel)panel.classList.toggle('hidden',key!==tab)});
 if(tab==='progressTab')renderProgress();
 if(tab==='social'||tab==='ranking'){
  window.aqwEnsureSupabaseFeatures?.().then(()=>{
   if(tab==='social')return window.aqwOpenSocialFeatures?.();
   if(tab==='ranking'){loadRushLeaderboard();loadPlayerLeaderboard();refreshLeaderboardRegistration()}
  }).catch(error=>console.warn('AQW services are unavailable:',error));
 }
}));
try{restoreLanguage()}catch(e){console.error('AQW language initialization failed:',e);const status=document.getElementById('quizStatus');if(status)status.textContent='表示設定の初期化に失敗しました。作品データの読み込みを続行します。';const start=document.getElementById('start');if(start){start.classList.remove('hidden');start.disabled=false;start.textContent='クイズを開始';}prepare().catch(error=>console.error('AQW recovery loading failed:',error))}

$('#resetProgress').onclick=()=>{const msg=lang==='ja'?'実績とプレイ記録をすべてリセットします。この操作は取り消せません。続行しますか？':'Reset all achievements and play records? This cannot be undone.';if(!confirm(msg))return;['aqw-history','aqw-total-runs','aqw-xp','aqw-daily-progress','aqw-daily-quest-claims','aqw-streak'].forEach(k=>safeStorage.removeItem(k));safeStorage.keys().filter(k=>k.startsWith('aqw-best-')).forEach(k=>safeStorage.removeItem(k));renderProgress();const hs=document.getElementById('historySummary');if(hs)hs.textContent='';const status=document.getElementById('resetDescription');if(status)status.textContent=lang==='ja'?'実績とプレイ記録をリセットしました。':'Achievements and play records have been reset.'};
const OFFICIAL_SITE_OVERRIDES=new Map([
 [1887,'https://www.kyotoanimation.co.jp/works/luckystar/'],
 [11061,'https://madhouse.co.jp/works/tv_hunter/'],
 [199,'https://www.ghibli.jp/works/chihiro/'],
 [10620,'https://future-diary.tv/'],
 [3588,'https://www.bones.co.jp/work/soul-eater/'],
 [11111,'https://www.pa-works.jp/works/another/'],
 [431,'https://www.ghibli.jp/works/howl/'],
 [19,'https://www.ntv.co.jp/monster/'],
 [9756,'https://www.madoka-magica.com/'],
 [164,'https://www.ghibli.jp/works/mononoke/'],
 [205,'https://www.fujitv.co.jp/b_hp/samuraichamploo/'],
 [523,'https://www.waltdisneystudios.jp/studio/ghibli/0242'],
 [853,'https://www.ntv.co.jp/host/'],
 [32,'https://www.eva-info.jp/works'],
 [16782,'https://kotonohanoniwa.jp/'],
 [226,'https://www.vap.co.jp/data/html/product/axub2yket24qrxw4.html'],
 [437,'https://madhouse.co.jp/english/works/movie_perfectblue/'],
 [47,'https://www.tms-e.co.jp/alltitles/1980s/059301.html'],
 [2890,'https://www.ghibli.jp/works/ponyo/'],
 [512,'https://www.ghibli.jp/works/majo/'],
 [43,'https://www.production-ig.co.jp/works/ghost-in-the-shell/'],
 [245,'https://www.fujitv.co.jp/b_hp/gtocomic/'],
 [10719,'https://www.tbs.co.jp/anime/haganai/1st/'],
 [249,'https://www.sunrise-inc.co.jp/yasya/home.html'],
 [21711,'https://www.shochiku.co.jp/cinema/lineup/91days/'],
 [125426,'https://www.ytv.co.jp/gokushufudo/index.html'],
 [11577,'https://steinsgate-movie.jp/'],
 [1943,'https://www.sonypictures.jp/he/815804'],
 [2236,'https://studiochizu.jp/works/tokiwokakerusyoujyo'],
 [227,'https://www.production-ig.co.jp/hotnews/2017/070301.html'],
 [16870,'https://www.dlas.jp/works/the-last-naruto-the-movie/'],
 [263,'https://www.ntv.co.jp/ippo/'],
 [14713,'https://www.tms-e.co.jp/alltitles/2010s/672101.html'],
 [578,'https://www.ghibli.jp/works/hotarunohaka/'],
 [777,'https://www.satelight.co.jp/works/hellsing-%EF%BC%88ova%E2%85%B0%EF%BD%9E%E2%85%B3%EF%BC%89/'],
 [14467,'https://goraproject.com/works/%EF%BD%8b%E3%80%80%E3%82%A2%E3%83%8B%E3%83%A1%E3%82%B7%E3%83%AA%E3%83%BC%E3%82%BA/'],
 [270,'https://www.gonzo.co.jp/works/hellsing/index.html'],
 [1195,'https://zero-tsukaima.com/'],
 [6,'https://madhouse.co.jp/english/works/'],
 [392,'https://pierrot.jp/archive/1990/'],
 [21366,'https://www.aniplex.co.jp/lineup/3lion/'],
 [100790,'https://oshiri-tantei.com/'],
 [10278,'https://www.aniplex.co.jp/lineup/idolmaster/'],
 [6880,'https://web.archive.org/web/*/http://dwl.jp/'],
 [790,'https://web.archive.org/web/20150815194937/http://www.ergoproxy.com/']
]);
function getSearchAnimeOfficialUrl(anime){
 const override=OFFICIAL_SITE_OVERRIDES.get(Number(anime?.id));
 if(override)return override;
 const links=Array.isArray(anime?.externalLinks)?anime.externalLinks:[];
 const socialHost=/(^|\.)(twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com|discord\.gg|discord\.com|reddit\.com)$/i;
 const candidates=links.map(link=>{
  if(!link||link.isDisabled||typeof link.url!=='string')return null;
  let parsed;
  try{parsed=new URL(link.url)}catch(e){return null}
  if(!['http:','https:'].includes(parsed.protocol)||socialHost.test(parsed.hostname))return null;
  const site=String(link.site||'').normalize('NFKC').toLowerCase();
  const type=String(link.type||'').toUpperCase();
  if(type==='STREAMING')return null;
  const explicitOfficial=/(official|公式|オフィシャル|homepage|home page|ホームページ|公式ページ|公式サイト)/i.test(site);
  const homeLabel=/(website|web site|homepage|home page|ホームページ|公式ページ)/i.test(site);
  let score=explicitOfficial?120:homeLabel?90:0;
  if(type==='INFO')score+=25;
  if(type==='SOCIAL')score-=10;
  if(/^ja|japanese/i.test(String(link.language||'')))score+=15;
  if(/official|anime|project|作品/i.test(parsed.hostname))score+=10;
  return {url:parsed.href,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score);
 const best=candidates[0];
 return best&&best.score>=80?best.url:'https://www.google.com/search?q='+encodeURIComponent(titleOf(anime)+' アニメ 公式サイト');
}
$('#searchForm').onsubmit=async e=>{e.preventDefault();$('#searchStatus').textContent=tr('searching');$('#results').replaceChildren();try{const fetched=await fetchAnime({page:1,perPage:18,search:$('#query').value.trim()});const list=fetched.filter(isUsableAnime);list.duplicateCount=Number(fetched.duplicateCount)||0;if(!list.length){$('#searchStatus').textContent=tr('notFound');return}$('#searchStatus').textContent=list.length+tr('items')+(list.duplicateCount?(lang==='ja'?'（同名の重複 '+list.duplicateCount+' 件を除外）':' ('+list.duplicateCount+' duplicate titles removed)'):'');list.forEach(a=>{const card=document.createElement('article');card.className='anime';const officialUrl=getSearchAnimeOfficialUrl(a);const imageLink=document.createElement('a');imageLink.href=officialUrl;imageLink.target='_self';imageLink.rel='noopener noreferrer';imageLink.title='公式サイトを開く（未登録の場合は公式サイトを検索）';imageLink.setAttribute('aria-label',titleOf(a)+'の公式サイトを開く');const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=a.coverImage.large;img.alt=titleOf(a)+tr('titleAlt');imageLink.append(img);const d=document.createElement('div');const strong=document.createElement('strong');strong.textContent=titleOf(a);const titleLink=document.createElement('a');titleLink.href=officialUrl;titleLink.target='_self';titleLink.rel='noopener noreferrer';titleLink.title='公式サイトを開く（未登録の場合は公式サイトを検索）';titleLink.setAttribute('aria-label',titleOf(a)+'の公式サイトを開く');titleLink.style.color='inherit';titleLink.style.textDecoration='none';titleLink.append(strong);const small=document.createElement('small');small.textContent=[a.seasonYear||tr('yearUnknown'),a.studios?.nodes?.[0]?.name||'',aliasCandidates(a)[0]||'',a.episodes?(a.episodes+(({ja:'話',en:' eps',ko:'화',zh:'集',es:' eps',fr:' ép.',pt:' eps',de:' Folgen'})[lang]||' eps')):tr('episodesUnknown')].filter(Boolean).join(' · ');d.append(titleLink,small);card.append(imageLink,d);$('#results').append(card)})}catch(err){$('#searchStatus').textContent=tr('apiError')}};
