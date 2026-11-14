(()=> {
const SUPABASE_URL='https://ksyfhscjfqzenifcttiu.supabase.co';
const SUPABASE_KEY='sb_publishable_eL_Da06cmHz3W58jpcBIBQ_YzTThTL4';
const $s=id=>document.getElementById(id);
const status=$s('aqwSocialStatus'),authMsg=$s('aqwAuthMessage'),postMsg=$s('aqwPostMessage');
let sb=null,currentUser=null,currentProfile=null;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const message=(el,text)=>{if(el)el.textContent=text};
const localJa=()=>lang==='ja';
const aqwRuntimeText={
ja:{imageTooLarge:'画像は5MB以下にしてください。',imageType:'JPEG、PNG、WebP、GIFのみ利用できます。',feedEmpty:'まだ投稿がありません。最初の投稿をしてみましょう。',imageAlt:'投稿画像',replyPlaceholder:'返信を書く',deleteConfirm:'この投稿を削除しますか？',profileSave:'プロフィールを保存しました。',usernameRule:'ユーザー名は半角英数字と _ の3〜24文字にしてください。',profileError:'プロフィールを読み込めませんでした：',feedError:'タイムラインを読み込めませんでした：',genericUser:'ユーザー',replyColon:'：'},
en:{imageTooLarge:'Images must be 5 MB or smaller.',imageType:'Only JPEG, PNG, WebP, and GIF images are supported.',feedEmpty:'No posts yet. Be the first to post.',imageAlt:'Post image',replyPlaceholder:'Write a reply',deleteConfirm:'Delete this post?',profileSave:'Profile saved.',usernameRule:'Username must be 3–24 characters using letters, numbers, and underscores.',profileError:'Could not load profile: ',feedError:'Could not load feed: ',genericUser:'User',replyColon:': '},
ko:{imageTooLarge:'이미지는 5MB 이하여야 합니다.',imageType:'JPEG, PNG, WebP, GIF 이미지만 사용할 수 있습니다.',feedEmpty:'아직 게시물이 없습니다. 첫 게시물을 작성해 보세요.',imageAlt:'게시물 이미지',replyPlaceholder:'답글 작성',deleteConfirm:'이 게시물을 삭제할까요?',profileSave:'프로필을 저장했습니다.',usernameRule:'사용자 이름은 영문자, 숫자, 밑줄(_)을 사용해 3~24자로 입력하세요.',profileError:'프로필을 불러오지 못했습니다: ',feedError:'피드를 불러오지 못했습니다: ',genericUser:'사용자',replyColon:': '},
zh:{imageTooLarge:'图片大小不能超过 5MB。',imageType:'仅支持 JPEG、PNG、WebP 和 GIF 图片。',feedEmpty:'还没有帖子，来发布第一条吧。',imageAlt:'帖子图片',replyPlaceholder:'写回复',deleteConfirm:'确定删除这条帖子吗？',profileSave:'个人资料已保存。',usernameRule:'用户名须为 3–24 个字符，只能包含英文字母、数字和下划线。',profileError:'无法加载个人资料：',feedError:'无法加载动态：',genericUser:'用户',replyColon:'：'},
es:{imageTooLarge:'Las imágenes deben tener un máximo de 5 MB.',imageType:'Solo se admiten imágenes JPEG, PNG, WebP y GIF.',feedEmpty:'Todavía no hay publicaciones. Sé la primera persona en publicar.',imageAlt:'Imagen de la publicación',replyPlaceholder:'Escribe una respuesta',deleteConfirm:'¿Eliminar esta publicación?',profileSave:'Perfil guardado.',usernameRule:'El nombre de usuario debe tener entre 3 y 24 caracteres: letras, números y guiones bajos.',profileError:'No se pudo cargar el perfil: ',feedError:'No se pudo cargar el feed: ',genericUser:'Usuario',replyColon:': '},
fr:{imageTooLarge:'Les images doivent faire 5 Mo maximum.',imageType:'Seules les images JPEG, PNG, WebP et GIF sont acceptées.',feedEmpty:'Aucune publication pour le moment. Publiez la première.',imageAlt:'Image de la publication',replyPlaceholder:'Écrire une réponse',deleteConfirm:'Supprimer cette publication ?',profileSave:'Profil enregistré.',usernameRule:'Le nom d’utilisateur doit comporter 3 à 24 caractères : lettres, chiffres et tirets bas.',profileError:'Impossible de charger le profil : ',feedError:'Impossible de charger le fil : ',genericUser:'Utilisateur',replyColon:' : '},
pt:{imageTooLarge:'As imagens devem ter no máximo 5 MB.',imageType:'Apenas imagens JPEG, PNG, WebP e GIF são aceitas.',feedEmpty:'Ainda não há publicações. Seja a primeira pessoa a publicar.',imageAlt:'Imagem da publicação',replyPlaceholder:'Escrever uma resposta',deleteConfirm:'Excluir esta publicação?',profileSave:'Perfil salvo.',usernameRule:'O nome de usuário deve ter de 3 a 24 caracteres, usando letras, números e sublinhados.',profileError:'Não foi possível carregar o perfil: ',feedError:'Não foi possível carregar o feed: ',genericUser:'Usuário',replyColon:': '},
de:{imageTooLarge:'Bilder dürfen höchstens 5 MB groß sein.',imageType:'Nur JPEG-, PNG-, WebP- und GIF-Bilder werden unterstützt.',feedEmpty:'Noch keine Beiträge. Veröffentliche den ersten Beitrag.',imageAlt:'Beitragsbild',replyPlaceholder:'Antwort schreiben',deleteConfirm:'Diesen Beitrag löschen?',profileSave:'Profil gespeichert.',usernameRule:'Der Benutzername muss 3–24 Zeichen lang sein und darf nur Buchstaben, Zahlen und Unterstriche enthalten.',profileError:'Profil konnte nicht geladen werden: ',feedError:'Feed konnte nicht geladen werden: ',genericUser:'Nutzer',replyColon:': '}
};
const rt=key=>(aqwRuntimeText[lang]||aqwRuntimeText.en)[key]||aqwRuntimeText.en[key]||key;
const stamp=s=>{try{return new Date(s).toLocaleString(localJa()?'ja-JP':undefined)}catch{return s||''}};
const setStatus=t=>message(status,t);
const aqwRushText={
 ja:{title:'スピードラッシュ・世界ランキング',description:'期間内に記録された各ユーザーのベストを表示します。全期間は従来の自己ベストを表示します。期間別記録はこの機能の公開後から集計します。記録は自己申告制です。',refresh:'更新',loading:'ランキングを読み込んでいます…',error:'ランキングを読み込めませんでした：',rank:'順位',player:'プレイヤー',score:'正解数',time:'タイム',needLogin:'記録を登録するにはAQWアカウントでログインしてください。',saved:'自己ベストをランキングに登録しました。',notBetter:'今回の記録は自己ベストを更新しませんでした。',submitError:'記録を登録できませんでした：',needTen:'10問すべて完了した記録のみ登録できます。',you:'あなた',share:'ランキングを共有',save:'画像を保存',shareError:'ランキング画像を作成できませんでした：',shareOpened:'共有メニューを開きました。',savedImage:'ランキング画像を保存しました。',emptyShare:'共有できるランキング記録がありません。',unverified:'自己申告記録・公式認証なし',myRank:'あなたの順位：',rankSuffix:'位（同点時は同順位）',loginRank:'ログインすると自分の順位を確認できます。',rankUnavailable:'自分の順位を取得できませんでした：'},
 en:{title:'Speed Rush · Global Leaderboard',description:'Shows each player’s best run within the selected period. All time uses existing personal bests; period records start from this feature’s release. Scores are self-reported.',refresh:'Refresh',loading:'Loading leaderboard…',error:'Could not load leaderboard: ',rank:'Rank',player:'Player',score:'Correct',time:'Time',needLogin:'Sign in with your AQW account to submit this score.',saved:'Your personal best was added to the leaderboard.',notBetter:'This run did not beat your personal best.',submitError:'Could not submit score: ',needTen:'Only completed 10-question runs can be submitted.',you:'YOU',share:'Share leaderboard',save:'Save image',shareError:'Could not create leaderboard image: ',shareOpened:'Share menu opened.',savedImage:'Leaderboard image saved.',emptyShare:'There are no leaderboard scores to share.',unverified:'Self-reported scores · Not officially verified',myRank:'Your rank: ',rankSuffix:' (ties share a rank)',loginRank:'Sign in to view your personal rank.',rankUnavailable:'Could not load your personal rank: '},
 ko:{title:'스피드 러시 · 세계 랭킹',description:'로그인하여 기록을 등록할 수 있습니다. 플레이어별 최고 기록을 표시합니다. 기록은 사용자 제출 방식이며 부정행위를 완전히 방지할 수 없습니다.',refresh:'새로고침',loading:'랭킹을 불러오는 중…',error:'랭킹을 불러오지 못했습니다: ',rank:'순위',player:'플레이어',score:'정답 수',time:'기록',needLogin:'기록을 등록하려면 AQW 계정으로 로그인하세요.',saved:'최고 기록을 랭킹에 등록했습니다.',notBetter:'이번 기록은 개인 최고 기록을 갱신하지 못했습니다.',submitError:'기록 등록 실패: ',needTen:'10문제를 모두 완료한 기록만 등록할 수 있습니다.',you:'나',share:'랭킹 공유',save:'이미지 저장',shareError:'랭킹 이미지를 만들 수 없습니다: ',shareOpened:'공유 메뉴를 열었습니다.',savedImage:'랭킹 이미지를 저장했습니다.',emptyShare:'공유할 랭킹 기록이 없습니다.',unverified:'사용자 제출 기록 · 공식 인증 없음'},
 zh:{title:'极速挑战 · 全球排行榜',description:'登录后即可提交成绩。榜单显示每位玩家的最佳成绩。成绩由玩家自行提交，无法完全验证。',refresh:'刷新',loading:'正在加载排行榜…',error:'无法加载排行榜：',rank:'排名',player:'玩家',score:'答对数',time:'用时',needLogin:'请登录 AQW 账号以提交成绩。',saved:'个人最佳成绩已加入排行榜。',notBetter:'本次成绩未刷新个人最佳。',submitError:'无法提交成绩：',needTen:'仅可提交完成全部10题的成绩。',you:'你',share:'分享排行榜',save:'保存图片',shareError:'无法生成排行榜图片：',shareOpened:'已打开分享菜单。',savedImage:'排行榜图片已保存。',emptyShare:'没有可分享的排行榜记录。',unverified:'玩家自行提交 · 未经官方验证'},
 es:{title:'Speed Rush · Clasificación mundial',description:'Inicia sesión para enviar tu marca. Se muestra el mejor resultado de cada jugador. Las marcas son autodeclaradas y no se pueden verificar por completo.',refresh:'Actualizar',loading:'Cargando clasificación…',error:'No se pudo cargar la clasificación: ',rank:'Puesto',player:'Jugador',score:'Aciertos',time:'Tiempo',needLogin:'Inicia sesión con tu cuenta AQW para enviar el resultado.',saved:'Tu mejor marca se añadió a la clasificación.',notBetter:'Esta partida no superó tu mejor marca.',submitError:'No se pudo enviar la marca: ',needTen:'Solo se pueden enviar partidas completas de 10 preguntas.',you:'TÚ',share:'Compartir ranking',save:'Guardar imagen',shareError:'No se pudo crear la imagen: ',shareOpened:'Se abrió el menú para compartir.',savedImage:'Imagen del ranking guardada.',emptyShare:'No hay resultados para compartir.',unverified:'Marcas autodeclaradas · Sin verificación oficial'},
 fr:{title:'Speed Rush · Classement mondial',description:'Connectez-vous pour envoyer un score. Le meilleur score de chaque joueur est affiché. Les scores sont déclaratifs et ne peuvent pas être entièrement vérifiés.',refresh:'Actualiser',loading:'Chargement du classement…',error:'Impossible de charger le classement : ',rank:'Rang',player:'Joueur',score:'Bonnes réponses',time:'Temps',needLogin:'Connectez-vous à votre compte AQW pour envoyer ce score.',saved:'Votre meilleur score a été ajouté au classement.',notBetter:'Cette partie n’a pas amélioré votre record.',submitError:'Impossible d’envoyer le score : ',needTen:'Seules les parties terminées de 10 questions peuvent être envoyées.',you:'VOUS',share:'Partager le classement',save:'Enregistrer l’image',shareError:'Impossible de créer l’image : ',shareOpened:'Menu de partage ouvert.',savedImage:'Image du classement enregistrée.',emptyShare:'Aucun score à partager.',unverified:'Scores déclaratifs · Non vérifiés officiellement'},
 pt:{title:'Speed Rush · Ranking mundial',description:'Entre na conta para enviar sua pontuação. O ranking mostra o recorde pessoal de cada jogador. As pontuações são autodeclaradas e não podem ser totalmente verificadas.',refresh:'Atualizar',loading:'Carregando ranking…',error:'Não foi possível carregar o ranking: ',rank:'Posição',player:'Jogador',score:'Acertos',time:'Tempo',needLogin:'Entre na sua conta AQW para enviar esta pontuação.',saved:'Seu recorde pessoal foi adicionado ao ranking.',notBetter:'Esta partida não superou seu recorde pessoal.',submitError:'Não foi possível enviar a pontuação: ',needTen:'Só é possível enviar partidas completas de 10 perguntas.',you:'VOCÊ',share:'Compartilhar ranking',save:'Salvar imagem',shareError:'Não foi possível criar a imagem: ',shareOpened:'Menu de compartilhamento aberto.',savedImage:'Imagem do ranking salva.',emptyShare:'Não há resultados para compartilhar.',unverified:'Pontuações autodeclaradas · Não verificadas oficialmente'},
 de:{title:'Speed Rush · Weltrangliste',description:'Melde dich an, um einen Rekord einzureichen. Angezeigt wird die persönliche Bestleistung. Die Ergebnisse werden selbst gemeldet und können nicht vollständig überprüft werden.',refresh:'Aktualisieren',loading:'Rangliste wird geladen…',error:'Rangliste konnte nicht geladen werden: ',rank:'Platz',player:'Spieler',score:'Richtig',time:'Zeit',needLogin:'Melde dich mit deinem AQW-Konto an, um den Rekord einzureichen.',saved:'Deine Bestleistung wurde zur Rangliste hinzugefügt.',notBetter:'Dieser Lauf hat deinen persönlichen Rekord nicht verbessert.',submitError:'Rekord konnte nicht gesendet werden: ',needTen:'Nur vollständig abgeschlossene Läufe mit 10 Fragen können gesendet werden.',you:'DU',share:'Rangliste teilen',save:'Bild speichern',shareError:'Ranglistenbild konnte nicht erstellt werden: ',shareOpened:'Teilen-Menü geöffnet.',savedImage:'Ranglistenbild gespeichert.',emptyShare:'Keine Ranglistenergebnisse zum Teilen.',unverified:'Selbst gemeldete Ergebnisse · Nicht offiziell geprüft'}
};
const aqwRushT=key=>(aqwRushText[lang]||aqwRushText.en)[key]||aqwRushText.en[key]||key;
aqwRushText.en.noPeriodRank='No record in this period yet.';aqwRushText.ja.noPeriodRank='この期間の記録はまだありません。';
const aqwPeriodLabels={ja:{label:'期間',all:'全期間',day:'今日',week:'今週',month:'今月'},en:{label:'Period',all:'All time',day:'Today',week:'This week',month:'This month'},ko:{label:'기간',all:'전체 기간',day:'오늘',week:'이번 주',month:'이번 달'},zh:{label:'期间',all:'全部时间',day:'今天',week:'本周',month:'本月'},es:{label:'Periodo',all:'Todo',day:'Hoy',week:'Esta semana',month:'Este mes'},fr:{label:'Période',all:'Tout',day:'Aujourd’hui',week:'Cette semaine',month:'Ce mois-ci'},pt:{label:'Período',all:'Todo',day:'Hoje',week:'Esta semana',month:'Este mês'},de:{label:'Zeitraum',all:'Gesamt',day:'Heute',week:'Diese Woche',month:'Dieser Monat'}};
const aqwPeriodT=key=>(aqwPeriodLabels[lang]||aqwPeriodLabels.en)[key]||aqwPeriodLabels.en[key]||key;
function applyPeriodLabels(){
 for(const [id,prefix] of [['aqwRushBoardPeriod','aqwRushBoardPeriodLabel'],['aqwPlayerBoardPeriod','aqwPlayerBoardPeriodLabel']]){
  const label=$s(prefix);if(label)label.textContent=aqwPeriodT('label');
  const select=$s(id);if(select)for(const value of ['all','day','week','month']){const option=select.querySelector('option[value="'+value+'"]');if(option)option.textContent=aqwPeriodT(value)}
 }
}
const aqwPlayerBoardText={
 ja:{title:'プレイヤー総合ランキング',description:'獲得XP・プレイ回数・正答率を期間別に比較できます。期間別集計はログイン中にサーバーへ保存されたプレイ記録を使用し、期間の区切りは日本時間です。',sort:'集計方法',xp:'総合XP',runs:'プレイ回数',accuracy:'正答率（10問以上）',refresh:'更新',loading:'ランキングを読み込んでいます…',error:'ランキングを読み込めませんでした：',rank:'順位',player:'プレイヤー',metric:'記録',detail:'プレイ回数・正答数',plays:'プレイ',correct:'正解',needLogin:'プレイ記録をランキングに反映するにはAQWアカウントでログインしてください。',saved:'プレイ記録をランキングに反映しました。',duplicate:'このプレイ記録は登録済みです。',submitError:'プレイ記録を登録できませんでした：',unverified:'記録は自己申告制です。公式認証済みの競技記録ではありません。',minAccuracy:'正答率ランキングは累計10問以上のプレイヤーが対象です。',myRank:'あなたの順位：',rankSuffix:'位（同点時は同順位）',loginRank:'ログインすると自分の順位を確認できます。',rankUnavailable:'自分の順位を取得できませんでした：'},
 en:{title:'Player Leaderboard',description:'Compare players by XP, quiz plays, and accuracy for the selected period. Period boundaries use Japan Standard Time; only server-recorded runs completed while signed in are counted.',sort:'Sort by',xp:'Total XP',runs:'Quiz plays',accuracy:'Accuracy (10+ questions)',refresh:'Refresh',loading:'Loading player rankings…',error:'Could not load player rankings: ',rank:'Rank',player:'Player',metric:'Record',detail:'Plays · Correct',plays:'Plays',correct:'Correct',needLogin:'Sign in to add this quiz to the player leaderboard.',saved:'Your quiz result was added to the leaderboard.',duplicate:'This quiz result was already submitted.',submitError:'Could not submit quiz result: ',unverified:'Self-reported records; not officially verified.',minAccuracy:'Accuracy rankings include players with at least 10 questions answered.',myRank:'Your rank: ',rankSuffix:' (ties share a rank)',loginRank:'Sign in to view your personal rank.',rankUnavailable:'Could not load your personal rank: '},
 ko:{title:'플레이어 종합 랭킹',description:'총 XP, 퀴즈 플레이 횟수, 정답률로 플레이어를 비교합니다. 로그인 상태에서 완료한 퀴즈만 집계됩니다.',sort:'정렬 기준',xp:'총 XP',runs:'플레이 횟수',accuracy:'정답률(10문제 이상)',refresh:'새로고침',loading:'랭킹을 불러오는 중…',error:'랭킹을 불러오지 못했습니다: ',rank:'순위',player:'플레이어',metric:'기록',detail:'플레이 · 정답',plays:'플레이',correct:'정답',needLogin:'랭킹에 기록하려면 로그인하세요.',saved:'퀴즈 기록을 랭킹에 반영했습니다.',duplicate:'이미 등록된 플레이 기록입니다.',submitError:'퀴즈 기록을 제출하지 못했습니다: ',unverified:'자기 신고 기록이며 공식 인증되지 않았습니다.',minAccuracy:'정답률 랭킹은 누적 10문제 이상인 플레이어만 포함합니다.'},
 zh:{title:'玩家综合排行榜',description:'按总经验值、游戏次数和正确率比较玩家。仅统计登录状态下完成的答题。',sort:'排序方式',xp:'总经验值',runs:'游戏次数',accuracy:'正确率（至少10题）',refresh:'刷新',loading:'正在加载排行榜…',error:'无法加载排行榜：',rank:'排名',player:'玩家',metric:'记录',detail:'次数 · 正确数',plays:'次数',correct:'正确',needLogin:'登录后才能将本次答题计入排行榜。',saved:'答题记录已计入排行榜。',duplicate:'这条答题记录已经提交过。',submitError:'无法提交答题记录：',unverified:'记录由玩家自行提交，未经官方验证。',minAccuracy:'正确率榜仅包含累计答题至少10题的玩家。'},
 es:{title:'Clasificación general de jugadores',description:'Compara a los jugadores por XP total, partidas y precisión. Solo cuentan las partidas completadas con la sesión iniciada.',sort:'Ordenar por',xp:'XP total',runs:'Partidas',accuracy:'Precisión (10+ preguntas)',refresh:'Actualizar',loading:'Cargando clasificación…',error:'No se pudo cargar la clasificación: ',rank:'Puesto',player:'Jugador',metric:'Registro',detail:'Partidas · Aciertos',plays:'Partidas',correct:'Aciertos',needLogin:'Inicia sesión para añadir esta partida a la clasificación.',saved:'Tu resultado se añadió a la clasificación.',duplicate:'Este resultado ya se había enviado.',submitError:'No se pudo enviar el resultado: ',unverified:'Registros autodeclarados; sin verificación oficial.',minAccuracy:'La clasificación de precisión requiere al menos 10 preguntas respondidas.'},
 fr:{title:'Classement général des joueurs',description:'Comparez les joueurs selon leur XP, leurs parties et leur précision. Seules les parties terminées avec une session ouverte sont comptabilisées.',sort:'Trier par',xp:'XP total',runs:'Parties',accuracy:'Précision (10+ questions)',refresh:'Actualiser',loading:'Chargement du classement…',error:'Impossible de charger le classement : ',rank:'Rang',player:'Joueur',metric:'Résultat',detail:'Parties · Réponses correctes',plays:'Parties',correct:'Correctes',needLogin:'Connectez-vous pour ajouter ce quiz au classement.',saved:'Votre résultat a été ajouté au classement.',duplicate:'Ce résultat a déjà été envoyé.',submitError:'Impossible d’envoyer le résultat : ',unverified:'Résultats déclaratifs, non vérifiés officiellement.',minAccuracy:'Le classement de précision inclut les joueurs ayant répondu à au moins 10 questions.'},
 pt:{title:'Ranking geral de jogadores',description:'Compare jogadores por XP total, partidas e precisão. Apenas partidas concluídas enquanto conectado são contabilizadas.',sort:'Ordenar por',xp:'XP total',runs:'Partidas',accuracy:'Precisão (10+ perguntas)',refresh:'Atualizar',loading:'Carregando ranking…',error:'Não foi possível carregar o ranking: ',rank:'Posição',player:'Jogador',metric:'Registro',detail:'Partidas · Acertos',plays:'Partidas',correct:'Acertos',needLogin:'Entre para adicionar esta partida ao ranking.',saved:'Seu resultado foi adicionado ao ranking.',duplicate:'Este resultado já foi enviado.',submitError:'Não foi possível enviar o resultado: ',unverified:'Registros autodeclarados, sem verificação oficial.',minAccuracy:'O ranking de precisão inclui jogadores com pelo menos 10 perguntas respondidas.'},
 de:{title:'Gesamt-Rangliste der Spieler',description:'Vergleiche Spieler nach XP, Quizrunden und Trefferquote. Gezählt werden nur Quizze, die während einer Anmeldung abgeschlossen wurden.',sort:'Sortieren nach',xp:'Gesamt-XP',runs:'Quizrunden',accuracy:'Trefferquote (mind. 10 Fragen)',refresh:'Aktualisieren',loading:'Rangliste wird geladen…',error:'Rangliste konnte nicht geladen werden: ',rank:'Platz',player:'Spieler',metric:'Ergebnis',detail:'Runden · Richtig',plays:'Runden',correct:'Richtig',needLogin:'Melde dich an, um dieses Quiz zur Rangliste hinzuzufügen.',saved:'Dein Ergebnis wurde zur Rangliste hinzugefügt.',duplicate:'Dieses Ergebnis wurde bereits übermittelt.',submitError:'Ergebnis konnte nicht gesendet werden: ',unverified:'Selbst gemeldete Ergebnisse, nicht offiziell geprüft.',minAccuracy:'Die Trefferquoten-Rangliste umfasst Spieler mit mindestens 10 beantworteten Fragen.'}
};
const aqwPlayerT=key=>(aqwPlayerBoardText[lang]||aqwPlayerBoardText.en)[key]||aqwPlayerBoardText.en[key]||key;
const aqwMatchProfileText={
 ja:{title:'1対1の戦績',refresh:'更新',loading:'対戦成績を読み込んでいます…',error:'対戦成績を読み込めませんでした：',matches:'対戦数',wins:'勝利',losses:'敗北',draws:'引き分け',recent:'最近の対戦',empty:'対戦履歴はまだありません。',opponent:'対戦相手',score:'スコア',questionsSuffix:'問',win:'勝ち',loss:'負け',draw:'引き分け'},
 en:{title:'1v1 Match Record',refresh:'Refresh',loading:'Loading match record…',error:'Could not load match record: ',matches:'Matches',wins:'Wins',losses:'Losses',draws:'Draws',recent:'Recent matches',empty:'No match history yet.',opponent:'Opponent',score:'Score',questionsSuffix:' questions',win:'Win',loss:'Loss',draw:'Draw'},
 ko:{title:'1대1 전적',refresh:'새로고침',loading:'대전 기록을 불러오는 중…',error:'대전 기록을 불러오지 못했습니다: ',matches:'대전 수',wins:'승리',losses:'패배',draws:'무승부',recent:'최근 대전',empty:'아직 대전 기록이 없습니다.',opponent:'상대',score:'점수',questionsSuffix:'문제',win:'승',loss:'패',draw:'무'},
 zh:{title:'1对1战绩',refresh:'刷新',loading:'正在加载对战记录…',error:'无法加载对战记录：',matches:'对战数',wins:'胜',losses:'负',draws:'平',recent:'最近对战',empty:'暂无对战记录。',opponent:'对手',score:'比分',questionsSuffix:'题',win:'胜',loss:'负',draw:'平'},
 es:{title:'Historial 1v1',refresh:'Actualizar',loading:'Cargando historial…',error:'No se pudo cargar el historial: ',matches:'Partidas',wins:'Victorias',losses:'Derrotas',draws:'Empates',recent:'Partidas recientes',empty:'Todavía no hay partidas.',opponent:'Rival',score:'Puntuación',questionsSuffix:' preguntas',win:'Victoria',loss:'Derrota',draw:'Empate'},
 fr:{title:'Bilan des duels 1v1',refresh:'Actualiser',loading:'Chargement de l’historique…',error:'Impossible de charger l’historique : ',matches:'Matchs',wins:'Victoires',losses:'Défaites',draws:'Nuls',recent:'Matchs récents',empty:'Aucun match pour le moment.',opponent:'Adversaire',score:'Score',questionsSuffix:' questions',win:'Victoire',loss:'Défaite',draw:'Nul'},
 pt:{title:'Histórico 1v1',refresh:'Atualizar',loading:'Carregando histórico…',error:'Não foi possível carregar o histórico: ',matches:'Partidas',wins:'Vitórias',losses:'Derrotas',draws:'Empates',recent:'Partidas recentes',empty:'Ainda não há partidas.',opponent:'Adversário',score:'Placar',questionsSuffix:' perguntas',win:'Vitória',loss:'Derrota',draw:'Empate'},
 de:{title:'1-gegen-1-Bilanz',refresh:'Aktualisieren',loading:'Spielverlauf wird geladen…',error:'Spielverlauf konnte nicht geladen werden: ',matches:'Spiele',wins:'Siege',losses:'Niederlagen',draws:'Unentschieden',recent:'Letzte Spiele',empty:'Noch keine Spiele vorhanden.',opponent:'Gegner',score:'Punktestand',questionsSuffix:' Fragen',win:'Sieg',loss:'Niederlage',draw:'Unentschieden'}
};
const aqwMatchProfileT=key=>(aqwMatchProfileText[lang]||aqwMatchProfileText.en)[key]||aqwMatchProfileText.en[key]||key;
aqwPlayerBoardText.en.noPeriodRank='No record in this period yet.';aqwPlayerBoardText.ja.noPeriodRank='この期間の記録はまだありません。';
function validPendingOwnerId(value){
 return value===null||typeof value==="undefined"||typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function loadPendingRunQueue(key,validator){
 try{
  const saved=JSON.parse(safeStorage.getItem(key)||"[]");
  if(!Array.isArray(saved))return [];
  return saved.filter(item=>item&&typeof item==="object"&&validPendingOwnerId(item.ownerUserId)&&validator(item)).slice(-25)
   .map(item=>({...item,ownerUserId:item.ownerUserId||null}));
 }catch(error){console.warn("Invalid pending AQW leaderboard queue was ignored:",error);return []}
}
let pendingPlayerRuns=loadPendingRunQueue("aqw-pending-player-runs",item=>
 typeof item.runId==="string"&&item.runId.length>0&&item.runId.length<=100&&
 Number.isInteger(item.correctCount)&&item.correctCount>=0&&
 Number.isInteger(item.questionCount)&&item.questionCount>=1&&item.questionCount<=10000&&
 [10,15].includes(item.xpMultiplier)&&Array.isArray(item.questionResults)&&item.questionResults.length<=10000
),playerLeaderboardCache=[],leaderboardProfiles=new Map();
let myMatchProfileCache=null;
let pendingRushResults=loadPendingRunQueue("aqw-pending-rush-results",item=>
 typeof item.runId==="string"&&item.runId.length>0&&item.runId.length<=100&&
 item.questionCount===10&&Number.isInteger(item.correctCount)&&item.correctCount>=0&&item.correctCount<=10&&
 Number.isFinite(item.elapsedMs)&&item.elapsedMs>0
);
function persistPendingRunQueue(queue){
 const key=queue===pendingRushResults?"aqw-pending-rush-results":"aqw-pending-player-runs";
 safeStorage.setItem(key,JSON.stringify(queue.slice(-25)));
}
function queuePendingRun(queue,result){
 if(!result||!result.runId)return;
 const copy={...result,ownerUserId:result.ownerUserId??currentUser?.id??null};
 const existing=queue.findIndex(item=>item.runId===copy.runId);
 if(existing>=0){
  if(copy.ownerUserId===null)copy.ownerUserId=queue[existing].ownerUserId??null;
  queue.splice(existing,1);
 }
 queue.push(copy);
 if(queue.length>25)queue.shift();
 persistPendingRunQueue(queue);
}
function removePendingRun(queue,runId){
 const index=queue.findIndex(item=>item.runId===runId);
 if(index>=0){queue.splice(index,1);persistPendingRunQueue(queue)}
}
function clearPendingRunsForUser(userId){
 for(const queue of [pendingPlayerRuns,pendingRushResults]){
  for(let i=queue.length-1;i>=0;i--){
   if(!queue[i].ownerUserId||queue[i].ownerUserId===userId)queue.splice(i,1);
  }
  persistPendingRunQueue(queue);
 }
}
function applyRushLeaderboardLanguage(){
 const map={aqwRushBoardTitle:'title',aqwRushBoardDescription:'description',aqwRushBoardRefresh:'refresh',aqwRushBoardShare:'share',aqwRushBoardSave:'save',aqwRushRankHeading:'rank',aqwRushPlayerHeading:'player',aqwRushScoreHeading:'score',aqwRushTimeHeading:'time'};
 for(const [id,key] of Object.entries(map)){const el=$s(id);if(el)el.textContent=aqwRushT(key)}
 applyPeriodLabels();
}
function formatRushTime(ms){return (Number(ms)/1000).toFixed(2)+' s'}
async function createRushBoardImage(){
 if(!sb)throw new Error('Community service unavailable');
 const period=$s('aqwRushBoardPeriod')?.value||'all';
 const {data,error}=await sb.rpc('get_aqw_speed_rush_leaderboard',{p_period:period});
 if(error)throw error;
 if(!data?.length)throw new Error(aqwRushT('emptyShare'));
 const imageRows=data.slice(0,10);
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 const bg=ctx.createLinearGradient(0,0,1200,630);bg.addColorStop(0,'#101a30');bg.addColorStop(1,'#263e67');ctx.fillStyle=bg;ctx.fillRect(0,0,1200,630);
 ctx.fillStyle='#8fb4ff';ctx.font='bold 22px Arial,sans-serif';ctx.fillText('ANIME QUIZ WORLD',70,64);
 ctx.fillStyle='#ffffff';ctx.font='bold 44px Arial,sans-serif';ctx.fillText('SPEED RUSH',70,125);
 ctx.fillStyle='#c9d7ee';ctx.font='24px Arial,sans-serif';ctx.fillText(aqwRushT('title'),70,164);
 const headers=[aqwRushT('rank'),aqwRushT('player'),aqwRushT('score'),aqwRushT('time')];
 const xs=[85,220,820,1010];ctx.fillStyle='#9fb5d7';ctx.font='bold 20px Arial,sans-serif';
 headers.forEach((h,i)=>ctx.fillText(h,xs[i],220));
 let prevScore=null,prevTime=null,rank=0;
 imageRows.forEach((item,index)=>{
  if(item.correct_count!==prevScore||item.elapsed_ms!==prevTime)rank=index+1;
  prevScore=item.correct_count;prevTime=item.elapsed_ms;
  const y=270+index*32;
  if(index<3){ctx.fillStyle=['#e6b83f','#aab6c5','#c18a61'][index];ctx.globalAlpha=.17;ctx.fillRect(65,y-25,1070,30);ctx.globalAlpha=1}
  ctx.fillStyle=index<3?['#f4d477','#d5deea','#e2b18b'][index]:'#ffffff';
  ctx.font='bold 20px Arial,sans-serif';ctx.fillText(String(rank),xs[0],y);
  let name=item.display_name||item.username||aqwRushT('player');
  if(name.length>26)name=name.slice(0,25)+'…';
  ctx.fillText(name,xs[1],y);
  ctx.fillText(String(item.correct_count)+'/10',xs[2],y);
  ctx.fillText(formatRushTime(item.elapsed_ms),xs[3],y);
 });
 ctx.fillStyle='#aebdd3';ctx.font='18px Arial,sans-serif';ctx.fillText(aqwRushT('unverified'),70,590);
 
 return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'anime-quiz-world-speed-rush-ranking.png',{type:'image/png'})):reject(new Error('PNG export failed')),'image/png'));
}
async function shareRushBoardImage(){
 try{
  const file=await createRushBoardImage();
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'Anime Quiz World · Speed Rush',files:[file]});message($s('aqwRushBoardStatus'),aqwRushT('shareOpened'));return}
  const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);message($s('aqwRushBoardStatus'),aqwRushT('savedImage'));
 }catch(e){message($s('aqwRushBoardStatus'),aqwRushT('shareError')+errText(e))}
}

async function createPlayerBoardImage(){
 const period=$s('aqwPlayerBoardPeriod')?.value||'all',metric=$s('aqwPlayerBoardSort')?.value||'xp';
 const {data,error}=await sb.rpc('get_aqw_player_leaderboard',{p_period:period,p_metric:metric});
 if(error)throw error;if(!data?.length)throw new Error(aqwPlayerT('empty'));
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 const bg=ctx.createLinearGradient(0,0,1200,630);bg.addColorStop(0,'#101a30');bg.addColorStop(1,'#263e67');ctx.fillStyle=bg;ctx.fillRect(0,0,1200,630);
 ctx.fillStyle='#8fb4ff';ctx.font='bold 22px Arial,sans-serif';ctx.fillText('ANIME QUIZ WORLD',70,64);
 ctx.fillStyle='#fff';ctx.font='bold 40px Arial,sans-serif';ctx.fillText('PLAYER RANKING',70,125);
 ctx.fillStyle='#c9d7ee';ctx.font='22px Arial,sans-serif';ctx.fillText(aqwPlayerT('title')+' · '+aqwPeriodT(period),70,164);
 const heads=[aqwPlayerT('rank'),aqwPlayerT('player'),aqwPlayerT('metric'),aqwPlayerT('detail')],xs=[85,220,820,1010];
 ctx.fillStyle='#9fb5d7';ctx.font='bold 20px Arial,sans-serif';heads.forEach((h,i)=>ctx.fillText(h,xs[i],220));
 const metricValue=x=>metric==='runs'?Number(x.total_runs||0):metric==='accuracy'?(Number(x.total_questions)?Number(x.total_correct)/Number(x.total_questions):0):Number(x.total_xp||0);
 const sorted=[...data].sort((a,b)=>metricValue(b)-metricValue(a));
 let previous=null,rank=0;
 sorted.slice(0,10).forEach((item,index)=>{const value=metricValue(item);if(value!==previous)rank=index+1;previous=value;const y=270+index*32;if(index<3){ctx.fillStyle=['#e6b83f','#aab6c5','#c18a61'][index];ctx.globalAlpha=.17;ctx.fillRect(65,y-25,1070,30);ctx.globalAlpha=1}
 ctx.fillStyle=index<3?['#f4d477','#d5deea','#e2b18b'][index]:'#fff';ctx.font='bold 20px Arial,sans-serif';ctx.fillText(String(rank),xs[0],y);
 let name=item.display_name||item.username||aqwPlayerT('player');if(name.length>26)name=name.slice(0,25)+'…';ctx.fillText(name,xs[1],y);
 const valueText=metric==='runs'?Number(item.total_runs||0).toLocaleString():metric==='accuracy'?Math.round(value*100)+'%':Number(item.total_xp||0).toLocaleString()+' XP';
 const detail=metric==='accuracy'?Number(item.total_correct||0)+' / '+Number(item.total_questions||0):Number(item.total_runs||0)+' '+aqwPlayerT('plays');
 ctx.fillText(valueText,xs[2],y);ctx.fillText(detail,xs[3],y);
 });
 ctx.fillStyle='#aebdd3';ctx.font='18px Arial,sans-serif';ctx.fillText(aqwPlayerT('unverified'),70,590);
 return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'anime-quiz-world-player-ranking.png',{type:'image/png'})):reject(new Error('PNG export failed')),'image/png'));
}
async function sharePlayerBoardImage(){
 try{const file=await createPlayerBoardImage();if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({title:'Anime Quiz World · Player Ranking',files:[file]});message($s('aqwPlayerBoardStatus'),aqwRushT('shareOpened'));return}
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);message($s('aqwPlayerBoardStatus'),aqwRushT('savedImage'));
 }catch(e){message($s('aqwPlayerBoardStatus'),aqwRushT('shareError')+errText(e))}
}
async function savePlayerBoardImage(){
 let url='';try{const file=await createPlayerBoardImage();url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();message($s('aqwPlayerBoardStatus'),aqwRushT('savedImage'))}
 catch(e){message($s('aqwPlayerBoardStatus'),aqwRushT('shareError')+errText(e))}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),10000)}
}
async function refreshLeaderboardRegistration(){
 if(!currentUser){message($s('aqwLeaderboardAccountStatus'),'ログインするとランキング登録を管理できます。');return}
 const {data,error}=await sb.from('profiles').select('leaderboard_enabled').eq('id',currentUser.id).maybeSingle();
 if(error){message($s('aqwLeaderboardAccountStatus'),'登録状態を取得できませんでした：'+errText(error));return}
 const enabled=data?.leaderboard_enabled!==false;
 const button=$s('aqwToggleLeaderboardRegistration');if(button)button.textContent=enabled?'ランキング登録を解除':'ランキングに再登録';
 message($s('aqwLeaderboardAccountStatus'),enabled?'ランキング登録中です。':'ランキング登録を解除しています。記録データは保持されています。');
}
async function toggleLeaderboardRegistration(){
 if(!currentUser){message($s('aqwLeaderboardAccountStatus'),'ランキング登録の変更にはログインが必要です。');return}
 const {data,error:readError}=await sb.from('profiles').select('leaderboard_enabled').eq('id',currentUser.id).maybeSingle();
 if(readError){message($s('aqwLeaderboardAccountStatus'),'登録状態を取得できませんでした：'+errText(readError));return}
 const enabled=data?.leaderboard_enabled!==false;
 const next=!enabled;
 if(!confirm(next?'ランキングに再登録しますか？':'ランキングへの掲載を停止します。保存済みの記録は削除されず、再登録すると再び表示されます。続行しますか？'))return;
 const {data:result,error}=await sb.rpc('set_aqw_leaderboard_enabled',{p_enabled:next});
 if(error){message($s('aqwLeaderboardAccountStatus'),'設定を変更できませんでした：'+errText(error));return}
 await refreshLeaderboardRegistration();await loadRushLeaderboard(true);await loadPlayerLeaderboard(true);
}
async function resetOnlineLeaderboardRecords(){
 if(!currentUser){message($s('aqwLeaderboardAccountStatus'),'実績のリセットにはログインが必要です。');return}
 if(!confirm('ログイン中の自分のサーバー上のランキング実績（総合XP・プレイ回数・正答数・スピードラッシュ記録と期間別履歴）だけを削除します。他のユーザーの記録や、このブラウザの作品データ・ローカル実績は削除されません。この操作は取り消せません。続行しますか？'))return;
 const button=$s('aqwResetOnlineRecords');if(button)button.disabled=true;
 message($s('aqwLeaderboardAccountStatus'),'自分のランキング実績を削除しています…');
 try{
  const {error}=await sb.rpc('reset_aqw_player_records');
  if(error)throw error;
  clearPendingRunsForUser(currentUser.id);
  await Promise.all([loadRushLeaderboard(),loadPlayerLeaderboard()]);
  message($s('aqwLeaderboardAccountStatus'),'自分のランキング実績を削除し、ランキングを更新しました。他のユーザーの記録と作品データは保持されています。');
 }catch(error){message($s('aqwLeaderboardAccountStatus'),'実績をリセットできませんでした：'+errText(error))}
 finally{if(button)button.disabled=false}
}

async function saveRushBoardImage(){
 let url='';
 try{const file=await createRushBoardImage();url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();message($s('aqwRushBoardStatus'),aqwRushT('savedImage'))}
 catch(e){message($s('aqwRushBoardStatus'),aqwRushT('shareError')+errText(e))}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),10000)}
}

function applyPlayerLeaderboardLanguage(){
 const map={aqwPlayerBoardTitle:'title',aqwPlayerBoardDescription:'description',aqwPlayerBoardSortLabel:'sort',aqwPlayerBoardRefresh:'refresh',aqwPlayerRankHeading:'rank',aqwPlayerNameHeading:'player',aqwPlayerMetricHeading:'metric',aqwPlayerDetailHeading:'detail'};
 for(const [id,key] of Object.entries(map)){const el=$s(id);if(el)el.textContent=aqwPlayerT(key)}
 const select=$s('aqwPlayerBoardSort');
 if(select){const values=['xp','runs','accuracy'];for(const value of values){const option=select.querySelector('option[value="'+value+'"]');if(option)option.textContent=aqwPlayerT(value)}}
}
function applyMatchProfileLanguage(){
 const heading=$s('aqwMatchProfileHeading'),refresh=$s('aqwRefreshMatchProfile'),recent=$s('aqwMatchProfileHistoryHeading');
 if(heading)heading.textContent=aqwMatchProfileT('title');
 if(refresh)refresh.textContent=aqwMatchProfileT('refresh');
 if(recent)recent.textContent=aqwMatchProfileT('recent');
 renderMyMatchProfile();
}
async function loadMyPlayerRank(mode,period){
 const el=$s('aqwMyPlayerRank');if(!el)return;
 if(!currentUser){message(el,aqwPlayerT('loginRank'));return}
 const {data,error}=await sb.rpc('get_aqw_player_my_rank',{p_period:period,p_metric:mode});
 if(error){message(el,aqwPlayerT('rankUnavailable')+errText(error));return}
 if(data==null){message(el,mode==='accuracy'?aqwPlayerT('minAccuracy'):aqwPlayerT('noPeriodRank'));return}
 message(el,aqwPlayerT('myRank')+Number(data).toLocaleString()+aqwPlayerT('rankSuffix'));
}
function renderPlayerLeaderboard(){
 const rows=$s('aqwPlayerBoardRows'),statusEl=$s('aqwPlayerBoardStatus');if(!rows||!statusEl)return;
 const mode=$s('aqwPlayerBoardSort')?.value||'xp';
 let data=[...playerLeaderboardCache];
 if(mode==='accuracy')data=data.filter(x=>Number(x.total_questions)>=10);
 const metric=x=>mode==='runs'?Number(x.total_runs||0):mode==='accuracy'?(Number(x.total_questions)>0?Number(x.total_correct)/Number(x.total_questions):0):Number(x.total_xp||0);
 data.sort((a,b)=>metric(b)-metric(a)||(mode==='accuracy'?Number(b.total_questions)-Number(a.total_questions):Number(b.total_xp)-Number(a.total_xp))||Number(b.total_runs)-Number(a.total_runs));
 rows.replaceChildren();
 if(!data.length){message(statusEl,aqwPlayerT('empty'));return}
 message(statusEl,aqwPlayerT('unverified')+(mode==='accuracy'?' '+aqwPlayerT('minAccuracy'):''));
 let previousMetric=null,currentRank=0;
 data.slice(0,20).forEach((item,index)=>{
  const currentMetric=metric(item);
  if(currentMetric!==previousMetric)currentRank=index+1;
  previousMetric=currentMetric;
  const profile={username:item.username,display_name:item.display_name};
  const trEl=document.createElement('tr');
  if(currentUser?.id===item.user_id)trEl.classList.add('is-me');
  if(currentRank<=3)trEl.classList.add('podium-'+currentRank);
  const rank=document.createElement('td');rank.className='rank-cell'+(currentRank<=3?' podium-'+currentRank:'');rank.textContent=String(currentRank);
  const player=document.createElement('td');player.className='aqw-player-cell';player.append(makeAvatarElement(leaderboardProfiles.get(item.user_id)?.avatar_path,profile?.display_name||profile?.username||aqwPlayerT('player')));const meta=document.createElement('span');meta.className='player-meta';
  const name=document.createElement('span');name.className='player-name';name.textContent=profile?.display_name||profile?.username||aqwPlayerT('player');
  const handle=document.createElement('span');handle.className='player-handle';handle.textContent='@'+(profile?.username||'user')+(currentUser?.id===item.user_id?' · '+aqwRushT('you'):'');meta.append(name,handle);player.append(meta);
  const value=document.createElement('td');
  const detail=document.createElement('td');
  value.dataset.label=mode==='runs'?'プレイ回数':mode==='accuracy'?'正答率':'総合XP';
  detail.dataset.label=mode==='runs'?'獲得XP':mode==='accuracy'?'正解数 / 出題数':'プレイ回数・正解数';
  if(mode==='runs'){value.textContent=Number(item.total_runs||0).toLocaleString();detail.textContent=Number(item.total_xp||0).toLocaleString()+' XP'}
  else if(mode==='accuracy'){const total=Number(item.total_questions||0),correct=Number(item.total_correct||0);value.textContent=(total?Math.round(correct/total*100):0)+'%';detail.textContent=correct.toLocaleString()+' / '+total.toLocaleString()}
  else{value.textContent=Number(item.total_xp||0).toLocaleString()+' XP';detail.textContent=Number(item.total_runs||0).toLocaleString()+' '+aqwPlayerT('plays')+' · '+Number(item.total_correct||0).toLocaleString()+' '+aqwPlayerT('correct')}
  trEl.append(rank,player,value,detail);rows.append(trEl);
 });
}
async function loadPlayerLeaderboardRemote(){
 if(!sb)return;
 const statusEl=$s('aqwPlayerBoardStatus'),rows=$s('aqwPlayerBoardRows'),mode=$s('aqwPlayerBoardSort')?.value||'xp',period=$s('aqwPlayerBoardPeriod')?.value||'all';
 message(statusEl,aqwPlayerT('loading'));rows.replaceChildren();
 const {data,error}=await sb.rpc('get_aqw_player_leaderboard',{p_period:period,p_metric:mode});
 if(error){playerLeaderboardCache=[];message(statusEl,aqwPlayerT('error')+errText(error));return}
 playerLeaderboardCache=data||[];const {data:avatarProfiles}=data.length?await sb.from('profiles').select('id,avatar_path').in('id',data.map(x=>x.user_id)):{data:[]};leaderboardProfiles=new Map((avatarProfiles||[]).map(x=>[x.id,x]));
 renderPlayerLeaderboard();
 await loadMyPlayerRank(mode,period);
}
let playerLeaderboardLoadedAt=0,playerLeaderboardLoading=null,playerLeaderboardLoadedKey='';
async function loadPlayerLeaderboard(force=false){
 if(!sb)return;
 const key=($s('aqwPlayerBoardSort')?.value||'xp')+'|'+($s('aqwPlayerBoardPeriod')?.value||'all');
 if(playerLeaderboardLoading)return playerLeaderboardLoading;
 if(!force&&playerLeaderboardLoadedKey===key&&Date.now()-playerLeaderboardLoadedAt<30000){renderPlayerLeaderboard();return}
 playerLeaderboardLoading=loadPlayerLeaderboardRemote().then(()=>{playerLeaderboardLoadedAt=Date.now();playerLeaderboardLoadedKey=key}).finally(()=>{
  playerLeaderboardLoading=null;
  const latestKey=($s('aqwPlayerBoardSort')?.value||'xp')+'|'+($s('aqwPlayerBoardPeriod')?.value||'all');
  if(latestKey!==playerLeaderboardLoadedKey)return loadPlayerLeaderboard(true);
 });
 return playerLeaderboardLoading;
}
async function loadQuestionDifficultyStats(){
 if(!sb)return;
 try{
  const {data,error}=await sb.rpc('get_aqw_question_difficulty_stats');
  if(error)throw error;
  if(Array.isArray(data))window.dispatchEvent(new CustomEvent('aqw:question-difficulty-stats',{detail:data}));
 }catch(error){console.warn('Question difficulty feedback could not be loaded:',error)}
}
async function loadMyDifficultyProfile(){
 if(!sb||!currentUser){window.dispatchEvent(new CustomEvent('aqw:personal-difficulty-profile',{detail:null}));return null}
 try{
  const {data,error}=await sb.rpc('get_aqw_my_difficulty_profile');
  if(error)throw error;
  const profile=data&&typeof data==='object'?data:{};
  window.dispatchEvent(new CustomEvent('aqw:personal-difficulty-profile',{detail:profile}));
  return profile;
 }catch(error){
  console.warn('Personal difficulty profile could not be loaded:',error);
  window.dispatchEvent(new CustomEvent('aqw:personal-difficulty-profile',{detail:null}));
  return null;
 }
}
window.aqwLoadPersonalDifficultyProfile=loadMyDifficultyProfile;
async function submitPlayerRun(result){
 if(!result||!result.runId||!Number.isInteger(result.correctCount)||!Number.isInteger(result.questionCount)||![10,15].includes(result.xpMultiplier))return;
 const pendingRun={runId:result.runId,correctCount:result.correctCount,questionCount:result.questionCount,xpMultiplier:result.xpMultiplier,questionResults:Array.isArray(result.questionResults)?result.questionResults:[],ownerUserId:result.ownerUserId??currentUser?.id??null};
 if(!currentUser){queuePendingRun(pendingPlayerRuns,pendingRun);message($s('aqwPlayerBoardStatus'),aqwPlayerT('needLogin'));return}
 if(pendingRun.ownerUserId&&pendingRun.ownerUserId!==currentUser.id)return;
 pendingRun.ownerUserId=currentUser.id;
 try{
  const {data,error}=await sb.rpc('submit_aqw_player_run',{p_run_id:result.runId,p_correct_count:result.correctCount,p_question_count:result.questionCount,p_xp_multiplier:result.xpMultiplier,p_question_results:pendingRun.questionResults});
  if(error){queuePendingRun(pendingPlayerRuns,pendingRun);message($s('aqwPlayerBoardStatus'),aqwPlayerT('submitError')+errText(error));return}
  removePendingRun(pendingPlayerRuns,result.runId);
  message($s('aqwPlayerBoardStatus'),data?.duplicate?aqwPlayerT('duplicate'):aqwPlayerT('saved'));
  await loadPlayerLeaderboard(true);
  await loadQuestionDifficultyStats();
  await loadMyDifficultyProfile();
 }catch(error){
  queuePendingRun(pendingPlayerRuns,pendingRun);
  message($s('aqwPlayerBoardStatus'),aqwPlayerT('submitError')+errText(error));
 }
}
async function loadMyRushRank(period){
 const el=$s('aqwMyRushRank');if(!el)return;
 if(!currentUser){message(el,aqwRushT('loginRank'));return}
 const {data,error}=await sb.rpc('get_aqw_speed_rush_my_rank',{p_period:period});
 if(error){message(el,aqwRushT('rankUnavailable')+errText(error));return}
 if(data==null){message(el,aqwRushT('noPeriodRank'));return}
 message(el,aqwRushT('myRank')+Number(data).toLocaleString()+aqwRushT('rankSuffix'));
}
async function loadRushLeaderboardRemote(){
 if(!sb)return;
 const statusEl=$s('aqwRushBoardStatus'),rows=$s('aqwRushBoardRows'),period=$s('aqwRushBoardPeriod')?.value||'all';
 message(statusEl,aqwRushT('loading'));rows.replaceChildren();
 const {data,error}=await sb.rpc('get_aqw_speed_rush_leaderboard',{p_period:period});
 if(error){message(statusEl,aqwRushT('error')+errText(error));return}
 if(!data?.length){message(statusEl,aqwRushT('empty'));await loadMyRushRank(period);return}
 const {data:avatarProfiles}=await sb.from('profiles').select('id,avatar_path').in('id',data.map(x=>x.user_id));leaderboardProfiles=new Map((avatarProfiles||[]).map(x=>[x.id,x]));
 message(statusEl,'');
 let previousScore=null,previousTime=null,currentRank=0;
 data.forEach((item,index)=>{
  if(item.correct_count!==previousScore||item.elapsed_ms!==previousTime)currentRank=index+1;
  previousScore=item.correct_count;previousTime=item.elapsed_ms;
  const trEl=document.createElement('tr');
  if(currentUser?.id===item.user_id)trEl.classList.add('is-me');
  if(currentRank<=3)trEl.classList.add('podium-'+currentRank);
  const rank=document.createElement('td');rank.className='rank-cell'+(currentRank<=3?' podium-'+currentRank:'');rank.textContent=String(currentRank);
  const player=document.createElement('td');player.className='aqw-player-cell';player.append(makeAvatarElement(leaderboardProfiles.get(item.user_id)?.avatar_path,item.display_name||item.username||aqwRushT('player')));const meta=document.createElement('span');meta.className='player-meta';
  const name=document.createElement('span');name.className='player-name';name.textContent=item.display_name||item.username||aqwRushT('player');
  const handle=document.createElement('span');handle.className='player-handle';handle.textContent='@'+(item.username||'user')+(currentUser?.id===item.user_id?' · '+aqwRushT('you'):'');meta.append(name,handle);player.append(meta);
  const score=document.createElement('td');score.dataset.label='正解数';score.textContent=String(item.correct_count)+'/10';
  const time=document.createElement('td');time.dataset.label='タイム';time.textContent=formatRushTime(item.elapsed_ms);
  trEl.append(rank,player,score,time);rows.append(trEl);
 });
 await loadMyRushRank(period);
}
let rushLeaderboardLoadedAt=0,rushLeaderboardLoading=null,rushLeaderboardLoadedPeriod='';
async function loadRushLeaderboard(force=false){
 if(!sb)return;
 const period=$s('aqwRushBoardPeriod')?.value||'all';
 if(rushLeaderboardLoading)return rushLeaderboardLoading;
 if(!force&&rushLeaderboardLoadedPeriod===period&&Date.now()-rushLeaderboardLoadedAt<30000)return;
 rushLeaderboardLoading=loadRushLeaderboardRemote().then(()=>{rushLeaderboardLoadedAt=Date.now();rushLeaderboardLoadedPeriod=period}).finally(()=>{
  rushLeaderboardLoading=null;
  const latestPeriod=$s('aqwRushBoardPeriod')?.value||'all';
  if(latestPeriod!==rushLeaderboardLoadedPeriod)return loadRushLeaderboard(true);
 });
 return rushLeaderboardLoading;
}
async function submitRushResult(result){
 if(!result||result.questionCount!==10||!Number.isInteger(result.correctCount)||result.correctCount<0||result.correctCount>10||!Number.isFinite(result.elapsedMs)){message($s('aqwRushBoardStatus'),aqwRushT('needTen'));return}
 result={...result,runId:result.runId||makeStatsRunId(),ownerUserId:result.ownerUserId??currentUser?.id??null};
 if(!currentUser){queuePendingRun(pendingRushResults,result);message($s('aqwRushBoardStatus'),aqwRushT('needLogin'));return}
 if(result.ownerUserId&&result.ownerUserId!==currentUser.id)return;
 result.ownerUserId=currentUser.id;
 try{
  const {data,error}=await sb.rpc('submit_aqw_speed_rush',{p_correct_count:result.correctCount,p_elapsed_ms:result.elapsedMs,p_run_id:result.runId});
  if(error){queuePendingRun(pendingRushResults,result);message($s('aqwRushBoardStatus'),aqwRushT('submitError')+errText(error));return}
  removePendingRun(pendingRushResults,result.runId);
  message($s('aqwRushBoardStatus'),data?.updated?aqwRushT('saved'):aqwRushT('notBetter'));
  await loadRushLeaderboard(true);
 }catch(error){
  queuePendingRun(pendingRushResults,result);
  message($s('aqwRushBoardStatus'),aqwRushT('submitError')+errText(error));
 }
}
const errText=e=>e?.message||String(e||'Unknown error');
let supabaseSdkPromise=null;
async function initSupabase(){
 if(!window.supabase?.createClient){
  if(!supabaseSdkPromise)supabaseSdkPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
   script.async=true;
   script.onload=()=>window.supabase?.createClient?resolve(true):reject(new Error('Supabase SDK did not initialize'));
   script.onerror=()=>reject(new Error('Supabase SDK download failed'));
   document.head.appendChild(script);
  });
  try{await supabaseSdkPromise}catch(error){
   supabaseSdkPromise=null;
   setStatus(localJa()?'SNSライブラリを読み込めませんでした。ネット接続を確認してください。':'Could not load the community module. Check your internet connection.');
   console.warn('AQW Supabase SDK load failed:',error);
   return false;
  }
 }
 if(!window.supabase?.createClient){setStatus(localJa()?'SNSライブラリを読み込めませんでした。ネット接続を確認してください。':'Could not load the community module. Check your internet connection.');return false}
 sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,storage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:true}});
 return true;
}
let signupMode=false;
const strongPassword=value=>value.length>=12&&value.length<=128&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/[0-9]/.test(value)&&/[^A-Za-z0-9]/.test(value);
function setAuthMode(signup){
 signupMode=signup;
 $s('aqwUsernameField').classList.toggle('hidden',!signup);
 $s('aqwDisplayNameField').classList.toggle('hidden',!signup);
 $s('aqwTermsField').classList.toggle('hidden',!signup);
 $s('aqwUsername').required=signup;
 $s('aqwAcceptTerms').required=signup;
 $s('aqwPassword').autocomplete=signup?'new-password':'current-password';
 $s('aqwPassword').minLength=signup?12:8;
 $s('aqwPassword').placeholder=signup?(localJa()?'12文字以上・大文字／小文字／数字／記号':'12+ chars with upper/lowercase, number and symbol'):'';
 $s('aqwAuthHeading').textContent=signup?(localJa()?'新規登録':'Create account'):(localJa()?'ログイン':'Sign in');
 $s('aqwSignIn').textContent=signup?(localJa()?'アカウントを作成':'Create account'):(localJa()?'ログイン':'Sign in');
 $s('aqwSignUp').textContent=signup?(localJa()?'ログインに戻る':'Back to sign in'):(localJa()?'新規登録はこちら':'Create an account');
 message(authMsg,'');
}
async function authAction(kind){
 message(authMsg,'');
 const email=$s('aqwEmail').value.trim(),password=$s('aqwPassword').value;
 if(kind==='signup'&&!$s('aqwAcceptTerms').checked){message(authMsg,localJa()?'新規登録には利用規約とプライバシーポリシーへの同意が必要です。':'You must accept the Terms of Use and Privacy Policy to create an account.');return}
 if(kind==='signup'&&!strongPassword(password)){message(authMsg,localJa()?'パスワードは12文字以上とし、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。':'Use 12–128 characters with at least one uppercase letter, lowercase letter, number and symbol.');return}
 const submitButton=$s('aqwSignIn');
 if(!sb){message(authMsg,localJa()?'ログイン機能を初期化できませんでした。ページを再読み込みしてください。':'Sign-in is unavailable. Reload the page and try again.');return}
 submitButton.disabled=true;
 try{
  if(kind==='signin'){
   const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
   message(authMsg,localJa()?'ログインしました。':'Signed in successfully.');
  }else{
   const username=$s('aqwUsername').value.trim(),display_name=$s('aqwDisplayName').value.trim();
   if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){message(authMsg,rt('usernameRule'));return}
   const {data,error}=await sb.auth.signUp({email,password,options:{data:{username,display_name:display_name||username},emailRedirectTo:location.origin+location.pathname}});
   if(error)throw error;
   if(data.session)message(authMsg,localJa()?'登録しました。ログイン状態になりました。':'Account created and signed in.');
   else message(authMsg,localJa()?'確認メールを送信しました。メール内のリンクから登録を完了してください。':'A confirmation email was sent. Follow its link to complete registration.');
  }
 }catch(e){message(authMsg,errText(e))}
 finally{submitButton.disabled=false}
}
async function refreshSession(session,{light=false}={}){
 currentUser=session?.user||null;currentProfile=null;
 if(light){if(!currentUser)window.dispatchEvent(new CustomEvent('aqw:personal-difficulty-profile',{detail:null}));return}
 await Promise.all([syncFollowRealtime(),syncNotificationRealtime()]);
 $s('aqwNotificationsButton').classList.toggle('hidden',!currentUser);$s('aqwEnableBrowserNotifications').classList.toggle('hidden',!currentUser);
 if(!currentUser)$s('aqwNotifications').classList.add('hidden');
 $s('aqwAuthPanel').classList.remove('hidden');
 $s('aqwMemberPanel').classList.toggle('hidden',!currentUser);
 $s('aqwSignOut').classList.toggle('hidden',!currentUser);
 $s('aqwForgotPassword').classList.toggle('hidden',!!currentUser);
 $s('aqwSignIn').classList.toggle('hidden',!!currentUser);
 $s('aqwSignUp').classList.toggle('hidden',!!currentUser);
 if(!currentUser){window.dispatchEvent(new CustomEvent('aqw:personal-difficulty-profile',{detail:null}));await closeFriendConversation();setStatus(localJa()?'ログインするとフォローとフレンドとのチャットを利用できます。':'Sign in to follow users and chat with friends.');return}
 try{
  const {data,error}=await sb.from('profiles').select('*').eq('id',currentUser.id).single();if(error)throw error;
  currentProfile=data;
  $s('aqwEditUsername').value=data.username||'';
  $s('aqwEditDisplayName').value=data.display_name||'';
  $s('aqwBio').value=data.bio||'';updateAvatarPreview(data.avatar_path||null);$s('aqwAvatarFile').value='';
  setStatus((localJa()?'ログイン中：@':'Signed in as @')+data.username);
  await Promise.all([loadFriends(),updateNotificationCount(),loadMyMatchProfile()]);
  await loadMyDifficultyProfile();
  for(const run of [...pendingRushResults])if(!run.ownerUserId||run.ownerUserId===currentUser.id)await submitRushResult(run);
  for(const run of [...pendingPlayerRuns])if(!run.ownerUserId||run.ownerUserId===currentUser.id)await submitPlayerRun(run);
 }catch(e){setStatus(rt('profileError')+errText(e))}
}
function renderMyMatchProfile(){
 const statsBox=$s('aqwMatchProfileStats'),historyBox=$s('aqwMatchProfileHistory');
 if(!statsBox||!historyBox)return;
 const summary=myMatchProfileCache?.stats||{};
 const values=[['matches',summary.matches],['wins',summary.wins],['losses',summary.losses],['draws',summary.draws]];
 statsBox.replaceChildren();
 for(const [key,value] of values){
  const card=document.createElement('div');card.className='aqw-match-stat';
  const label=document.createElement('span');label.textContent=aqwMatchProfileT(key);
  const count=document.createElement('strong');count.textContent=Number(value||0).toLocaleString();
  card.append(label,count);statsBox.append(card);
 }
 const matches=Array.isArray(myMatchProfileCache?.matches)?myMatchProfileCache.matches:[];
 historyBox.replaceChildren();
 if(!matches.length){
  const empty=document.createElement('p');empty.className='aqw-empty';empty.textContent=aqwMatchProfileT('empty');historyBox.append(empty);return;
 }
 for(const match of matches){
  const row=document.createElement('div');row.className='aqw-match-history-item';
  const main=document.createElement('div');main.className='aqw-match-history-main';
  const opponent=document.createElement('strong');opponent.textContent=match.opponent_name||match.opponent_username||aqwMatchProfileT('opponent');
  const meta=document.createElement('span');
  meta.textContent=aqwMatchProfileT('score')+': '+Number(match.my_score||0)+'–'+Number(match.opponent_score||0)+' · '+Number(match.question_count||0)+aqwMatchProfileT('questionsSuffix')+' · '+stamp(match.finished_at);
  main.append(opponent,meta);
  const outcome=['win','loss','draw'].includes(match.result)?match.result:'draw';
  const result=document.createElement('span');result.className='aqw-match-result '+outcome;result.textContent=aqwMatchProfileT(outcome);
  row.append(main,result);historyBox.append(row);
 }
}
async function loadMyMatchProfile(){
 const status=$s('aqwMatchProfileStatus'),button=$s('aqwRefreshMatchProfile');
 if(!status)return;
 if(!currentUser||!sb){myMatchProfileCache=null;renderMyMatchProfile();status.textContent='';return}
 if(button)button.disabled=true;
 status.textContent=aqwMatchProfileT('loading');
 try{
  const {data,error}=await sb.rpc('aqw_match_history',{p_limit:10});
  if(error)throw error;
  myMatchProfileCache=data||{stats:{matches:0,wins:0,losses:0,draws:0},matches:[]};
  renderMyMatchProfile();status.textContent='';
 }catch(error){
  myMatchProfileCache=null;renderMyMatchProfile();status.textContent=aqwMatchProfileT('error')+errText(error);
 }finally{if(button)button.disabled=false}
}
function avatarPublicUrl(path){if(!path)return '';if(/^https?:\/\//i.test(path))return path;return sb.storage.from('aqw-social').getPublicUrl(path).data.publicUrl}
function makeAvatarElement(path,label='ユーザー'){
 const wrap=document.createElement('span');wrap.className='aqw-user-avatar';const img=document.createElement('img');img.alt=label+'のアイコン';img.loading='lazy';img.src=avatarPublicUrl(path);img.onerror=()=>{img.remove();wrap.textContent=String(label||'?').trim().charAt(0)||'?'};if(!path){wrap.textContent=String(label||'?').trim().charAt(0)||'?'}else wrap.append(img);return wrap;
}
async function uploadAvatar(file){
 if(!file)return null;
 if(file.size>5*1024*1024)throw new Error(rt('imageTooLarge'));
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error(rt('imageType'));
 const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
 const path=currentUser.id+'/avatar-'+crypto.randomUUID()+'.'+ext;
 const {error}=await sb.storage.from('aqw-social').upload(path,file,{contentType:file.type,upsert:false});
 if(error)throw error;return path;
}
async function removeStoredAvatar(path){if(!path||/^https?:\/\//i.test(path))return;const {error}=await sb.storage.from('aqw-social').remove([path]);if(error)console.warn('Could not remove previous avatar:',error.message)}
function updateAvatarPreview(path){
 const image=$s('aqwAvatarPreviewImage'),fallback=$s('aqwAvatarFallback');$s('aqwRemoveAvatar').disabled=!path;
 if(path){image.src=avatarPublicUrl(path);image.classList.remove('hidden');fallback.classList.add('hidden');image.onerror=()=>{image.classList.add('hidden');fallback.classList.remove('hidden')}}
 else{image.removeAttribute('src');image.classList.add('hidden');fallback.classList.remove('hidden')}
}
async function uploadImage(file){
 if(!file)return null;
 if(file.size>5*1024*1024)throw new Error(rt('imageTooLarge'));
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw new Error(rt('imageType'));
 const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
 const path=currentUser.id+'/'+crypto.randomUUID()+'.'+ext;
 const {error}=await sb.storage.from('aqw-social').upload(path,file,{contentType:file.type,upsert:false});
 if(error)throw error;
 const {data}=sb.storage.from('aqw-social').getPublicUrl(path);
 return data.publicUrl;
}
async function loadFeed(){
 if(!sb)return;
 const feed=$s('aqwFeed');feed.replaceChildren();
 let blockedIds=new Set();
 if(currentUser){
  const {data:blockedRows,error:blockError}=await sb.from('user_blocks').select('blocked_id').eq('blocker_id',currentUser.id);
  if(blockError){feed.textContent=rt('feedError')+errText(blockError);return}
  blockedIds=new Set((blockedRows||[]).map(row=>row.blocked_id));blockedUserIds=blockedIds;
 }
 const {data:posts,error}=await sb.from('posts').select('id,user_id,body,image_path,parent_post_id,quiz_result,created_at,profiles(username,display_name,avatar_path)').is('parent_post_id',null).order('created_at',{ascending:false}).limit(50);
 if(error){feed.textContent=rt('feedError')+errText(error);return}
 const visiblePosts=(posts||[]).filter(post=>!blockedIds.has(post.user_id));
 if(!visiblePosts.length){feed.innerHTML='<div class="aqw-empty">'+rt('feedEmpty')+'</div>';return}
 const postIds=visiblePosts.map(post=>post.id);
 const {data:likeRows,error:likesError}=await sb.from('post_likes').select('post_id').in('post_id',postIds);
 const likeCounts=new Map();
 if(!likesError){for(const row of likeRows||[])likeCounts.set(row.post_id,(likeCounts.get(row.post_id)||0)+1)}
 const rendered=[];for(let i=0;i<visiblePosts.length;i+=8){const batch=await Promise.all(visiblePosts.slice(i,i+8).map(post=>renderPost(post,likesError?undefined:(likeCounts.get(post.id)||0))));rendered.push(...batch)}
 const fragment=document.createDocumentFragment();rendered.forEach(node=>fragment.append(node));feed.append(fragment)
}
async function renderPost(post,initialLikeCount){
 const article=document.createElement('article');article.className='aqw-post';
 const profile=post.profiles||{};
 const head=document.createElement('div');head.className='aqw-post-head';
 const who=document.createElement('strong');who.textContent=(profile.display_name||profile.username||'AQW User')+' @'+(profile.username||'user');
 const time=document.createElement('small');time.textContent=stamp(post.created_at);
 head.append(makeAvatarElement(profile.avatar_path,profile.display_name||profile.username),who,time);article.append(head);
 if(post.body){const body=document.createElement('p');body.className='aqw-post-body';body.textContent=post.body;article.append(body)}
 if(post.image_path){const img=document.createElement('img');img.className='aqw-post-image';img.loading='lazy';img.src=post.image_path;img.alt=rt('imageAlt');article.append(img)}
 if(post.quiz_result){const result=document.createElement('p');result.className='muted';result.textContent=(localJa()?'クイズ結果：':'Quiz result: ')+JSON.stringify(post.quiz_result);article.append(result)}
 const actions=document.createElement('div');actions.className='aqw-post-actions';
 const like=document.createElement('button');like.type='button';like.textContent=localJa()?'いいね':'Like';
 let likeCount=initialLikeCount;
 if(likeCount===undefined){const result=await sb.from('post_likes').select('*',{count:'exact',head:true}).eq('post_id',post.id);likeCount=result.count}
 const count=document.createElement('small');count.textContent=' '+(likeCount||0);
 const replyBtn=document.createElement('button');replyBtn.type='button';replyBtn.textContent=localJa()?'返信を見る / 返信する':'View / write replies';
 const deleteBtn=document.createElement('button');deleteBtn.type='button';deleteBtn.textContent=localJa()?'自分の投稿を削除':'Delete your post';deleteBtn.className='danger-button';deleteBtn.classList.toggle('hidden',post.user_id!==currentUser?.id);
 actions.append(like,count,replyBtn,deleteBtn);
 if(currentUser&&post.user_id!==currentUser.id){
  const reportBtn=document.createElement('button');reportBtn.type='button';reportBtn.textContent=localJa()?'通報':'Report';
  reportBtn.onclick=()=>openReportPanel(post.user_id,null,post.id);
  const blockBtn=document.createElement('button');blockBtn.type='button';blockBtn.className='danger-button';blockBtn.textContent=localJa()?'ブロック':'Block';
  blockBtn.onclick=()=>blockUser(post.user_id,who.textContent);
  actions.append(reportBtn,blockBtn);
 }
 article.append(actions);
 like.disabled=!currentUser;
 like.onclick=async()=>{try{const {data:existing,error}=await sb.from('post_likes').select('post_id').eq('post_id',post.id).eq('user_id',currentUser.id).maybeSingle();if(error)throw error;if(existing){const r=await sb.from('post_likes').delete().eq('post_id',post.id).eq('user_id',currentUser.id);if(r.error)throw r.error}else{const r=await sb.from('post_likes').insert({post_id:post.id,user_id:currentUser.id});if(r.error)throw r.error}const {count:n}=await sb.from('post_likes').select('*',{count:'exact',head:true}).eq('post_id',post.id);count.textContent=' '+(n||0)}catch(e){message(postMsg,errText(e))}};
 deleteBtn.onclick=async()=>{if(!confirm(rt('deleteConfirm')))return;const {error}=await sb.from('posts').delete().eq('id',post.id);if(error)message(postMsg,errText(error));else await loadFeed()};
 const replies=document.createElement('div');replies.className='aqw-replies hidden';
 replyBtn.onclick=async()=>{
  replies.classList.toggle('hidden');
  if(!replies.dataset.loaded&&!replies.classList.contains('hidden')){
   replies.dataset.loaded='1';
   const {data,error}=await sb.from('posts').select('id,user_id,body,created_at,profiles(username,display_name,avatar_path)').eq('parent_post_id',post.id).order('created_at');
   if(error){replies.textContent=errText(error)}
   else {
    const visibleReplies=(data||[]).filter(reply=>!blockedUserIds.has(reply.user_id));
    if(!visibleReplies.length){replies.textContent=localJa()?'表示できる返信はありません。':'No visible replies.'}
    else visibleReplies.forEach(r=>{
    const row=document.createElement('div');row.className='aqw-reply-row';
    const p=document.createElement('p');p.textContent=(r.profiles?.display_name||r.profiles?.username||rt('genericUser'))+rt('replyColon')+r.body+' ('+stamp(r.created_at)+')';row.append(p);
    if(currentUser&&r.user_id!==currentUser.id){
     const replyActions=document.createElement('div');replyActions.className='aqw-message-actions';
     const reportReply=document.createElement('button');reportReply.type='button';reportReply.textContent=localJa()?'通報':'Report';reportReply.onclick=()=>openReportPanel(r.user_id,null,r.id);
     const blockReply=document.createElement('button');blockReply.type='button';blockReply.className='danger-button';blockReply.textContent=localJa()?'ブロック':'Block';blockReply.onclick=()=>blockUser(r.user_id,(r.profiles?.display_name||r.profiles?.username||''));
     replyActions.append(reportReply,blockReply);row.append(replyActions);
    }
    replies.append(row);
    });
   }
  }
 };
 if(currentUser){
  const form=document.createElement('form');form.className='aqw-reply-form';
  const input=document.createElement('input');input.maxLength=2000;input.required=true;input.placeholder=rt('replyPlaceholder');
  const submit=document.createElement('button');submit.type='submit';submit.textContent=localJa()?'返信':'Reply';form.append(input,submit);
  form.onsubmit=async e=>{e.preventDefault();const {error}=await sb.from('posts').insert({user_id:currentUser.id,parent_post_id:post.id,body:input.value.trim()});if(error)message(postMsg,errText(error));else{input.value='';await loadFeed()}};
  replies.append(form);
 }
 article.append(replies);return article;
}
async function doPost(bodyOverride){
 if(!currentUser){message(postMsg,localJa()?'投稿するにはログインしてください。':'Sign in to create a post.');return}
 const body=(bodyOverride??$s('aqwPostBody').value).trim(),file=$s('aqwPostImage').files[0];
 if(!body&&!file){message(postMsg,localJa()?'本文または画像を入力してください。':'Enter text or select an image.');return}
 message(postMsg,localJa()?'投稿しています…':'Publishing…');
 try{let image_path=null;if(file)image_path=await uploadImage(file);const {error}=await sb.from('posts').insert({user_id:currentUser.id,body,image_path});if(error)throw error;$s('aqwPostBody').value='';$s('aqwPostImage').value='';message(postMsg,localJa()?'投稿しました。':'Post published.');await loadFeed()}catch(e){message(postMsg,(localJa()?'投稿できませんでした：':'Could not publish: ')+errText(e))}
}
async function searchUsers(e){
 e?.preventDefault?.();
 const term=$s('aqwUserSearch').value.trim(),box=$s('aqwUserResults');
 box.textContent=localJa()?'検索中…':'Searching…';
 const safeTerm=term.normalize('NFKC').replace(/[^\p{L}\p{N} -]/gu,'').trim().slice(0,64);
 if([...safeTerm].length<2){box.textContent=localJa()?'検索できる文字を2文字以上入力してください。':'Enter at least two searchable letters or numbers.';return}
 const {data,error}=await sb.from('profiles').select('id,username,display_name,bio,avatar_path').or('username.ilike.%'+safeTerm+'%,display_name.ilike.%'+safeTerm+'%').limit(20);
 if(error){box.textContent=errText(error);return}
 box.replaceChildren();
 const people=(data||[]).filter(p=>p.id!==currentUser?.id);
 if(!people.length){box.textContent=localJa()?'ユーザーが見つかりません。':'No users found.';return}
 const ids=people.map(p=>p.id);
 let outgoing=new Set(),incoming=new Set();
 if(currentUser){
  const [out,incomingResult]=await Promise.all([
   sb.from('follows').select('following_id').eq('follower_id',currentUser.id).in('following_id',ids),
   sb.from('follows').select('follower_id').eq('following_id',currentUser.id).in('follower_id',ids)
  ]);
  if(out.error||incomingResult.error){box.textContent=errText(out.error||incomingResult.error);return}
  outgoing=new Set((out.data||[]).map(x=>x.following_id));
  incoming=new Set((incomingResult.data||[]).map(x=>x.follower_id));
 }
 for(const p of people){
  const row=document.createElement('div');row.className='aqw-user-row';
  row.append(makeAvatarElement(p.avatar_path,p.display_name||p.username));
  const label=document.createElement('span');label.className='user-label';
  label.textContent=(p.display_name||p.username)+' @'+p.username+(p.bio?' — '+p.bio:'');
  row.append(label);
  if(!currentUser){
   const status=document.createElement('small');status.className='muted';status.textContent=localJa()?'フォローするにはログインしてください。':'Sign in to follow this user.';row.append(status);
  }else{
   const isFollowing=outgoing.has(p.id),followsYou=incoming.has(p.id),isFriend=isFollowing&&followsYou;
   const state=document.createElement('small');state.className='muted';
   state.textContent=isFriend?(localJa()?'相互フォロー・フレンド': 'Friends · mutual follow'):isFollowing?(localJa()?'フォロー中': 'Following'):followsYou?(localJa()?'フォローされています': 'Follows you'):'';
   if(state.textContent)row.append(state);
   const action=document.createElement('button');action.type='button';
   action.textContent=isFriend?(localJa()?'チャットを開く':'Open chat'):isFollowing?(localJa()?'フォロー解除':'Unfollow'):(followsYou?(localJa()?'フォロー返し':'Follow back'):(localJa()?'フォロー':'Follow'));
   action.onclick=async()=>{
    action.disabled=true;
    const result=isFollowing
     ?await sb.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',p.id)
     :await sb.from('follows').insert({follower_id:currentUser.id,following_id:p.id});
    if(result.error){action.disabled=false;message(authMsg,errText(result.error));return}
    await Promise.all([searchUsers({preventDefault(){}}),loadFriends()]);
   };
   if(isFriend)action.onclick=()=>openFriendConversation(p.id,(p.display_name||p.username)+' @'+p.username);
   row.append(action);
   const reportUser=document.createElement('button');reportUser.type='button';reportUser.textContent=localJa()?'通報':'Report';
   reportUser.onclick=()=>openReportPanel(p.id,null,null);row.append(reportUser);
   if(blockedUserIds.has(p.id)){
    const unblock=document.createElement('button');unblock.type='button';unblock.textContent=localJa()?'ブロック解除':'Unblock';
    unblock.onclick=()=>unblockUser(p.id);row.append(unblock);
   }else{
    const block=document.createElement('button');block.type='button';block.className='danger-button';block.textContent=localJa()?'ブロック':'Block';
    block.onclick=()=>blockUser(p.id,(p.display_name||p.username)+' @'+p.username);row.append(block);
   }
  }
  box.append(row);
 }
}
async function updateNotificationCount(){
 if(!currentUser)return;
 const {count,error}=await sb.from('notifications').select('id',{count:'exact',head:true}).eq('recipient_id',currentUser.id).is('read_at',null);
 if(error){console.warn('AQW notification count failed:',error);return}
 const button=$s('aqwNotificationsButton');if(button)button.textContent=(localJa()?'通知':'Notifications')+'（'+(count||0)+'）';
}
async function loadNotifications(){
 const box=$s('aqwNotifications');box.textContent=localJa()?'読み込み中…':'Loading…';
 if(!currentUser){box.textContent=localJa()?'通知を見るにはログインしてください。':'Sign in to view notifications.';return}
 const {data,error}=await sb.from('notifications').select('id,actor_id,kind,post_id,created_at,read_at,actor:profiles!notifications_actor_id_fkey(username,display_name)').eq('recipient_id',currentUser.id).order('created_at',{ascending:false}).limit(50);
 if(error){box.textContent=errText(error);return}box.replaceChildren();
 if(!data.length){box.textContent=localJa()?'通知はありません。':'No notifications.';await updateNotificationCount();return}
 for(const n of data){
  const row=document.createElement('div');row.className='aqw-notification'+(n.read_at?' is-read':'');
  const actor=n.actor?.display_name||n.actor?.username||(localJa()?'ユーザー':'User');
  const verbs=localJa()?{follow:'があなたをフォローしました',like:'があなたの投稿にいいねしました',reply:'があなたに返信しました',message:'からメッセージが届きました'}:{follow:' followed you',like:' liked your post',reply:' replied to you',message:' sent you a message'};
  const content=document.createElement('span');content.textContent=actor+(verbs[n.kind]||(localJa()?'がアクションしました':' performed an action'))+' · '+stamp(n.created_at);row.append(content);
  if(n.kind==='message'){
   const open=document.createElement('button');open.type='button';open.textContent=localJa()?'チャットを開く':'Open chat';
   open.onclick=async()=>{const {data:profile}=await sb.from('profiles').select('id,username,display_name').eq('id',n.actor_id).maybeSingle();if(profile)await openFriendConversation(profile.id,(profile.display_name||profile.username)+' @'+profile.username)};
   row.append(open);
  }
  if(!n.read_at){
   const button=document.createElement('button');button.type='button';button.textContent=localJa()?'既読':'Mark as read';
   button.onclick=async()=>{button.disabled=true;const {error:updateError}=await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id).eq('recipient_id',currentUser.id);if(updateError){button.disabled=false;message(status,errText(updateError));return}row.classList.add('is-read');button.remove();await updateNotificationCount()};
   row.append(button);
  }
  box.append(row);
 }
 await updateNotificationCount();
}
async function syncNotificationRealtime(){
 const uid=currentUser?.id||null;
 if(notificationRealtimeUserId===uid&&notificationRealtimeChannel)return;
 if(notificationRealtimeChannel){try{await sb.removeChannel(notificationRealtimeChannel)}catch(e){}notificationRealtimeChannel=null}
 notificationRealtimeUserId=uid;if(!uid)return;
 notificationRealtimeChannel=sb.channel('aqw-notifications-'+uid)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'recipient_id=eq.'+uid},async payload=>{
   await updateNotificationCount();
   if(!$s('aqwNotifications').classList.contains('hidden'))await loadNotifications();
   const item=payload.new||{};
   const result=await sb.from('profiles').select('username,display_name').eq('id',item.actor_id).maybeSingle();
   const name=result.data?.display_name||result.data?.username||(localJa()?'ユーザー':'User');
   const verb=localJa()?({follow:'があなたをフォローしました',like:'があなたの投稿にいいねしました',reply:'があなたに返信しました',message:'からメッセージが届きました'}[item.kind]||'新しい通知があります'):({follow:' followed you',like:' liked your post',reply:' replied to you',message:' sent you a message'}[item.kind]||'You have a new notification');
   if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState==='hidden'){
    try{const note=new Notification('Anime Quiz World',{body:name+verb,tag:'aqw-'+item.id});note.onclick=()=>{window.focus();$s('aqwNotifications').classList.remove('hidden');loadNotifications();note.close()}}catch(e){}
   }
  }).subscribe();
}
async function enableBrowserNotifications(){
 if(!('Notification' in window)){message(authMsg,localJa()?'このブラウザは通知に対応していません。':'This browser does not support notifications.');return}
 try{const permission=await Notification.requestPermission();if(permission==='granted')$s('aqwEnableBrowserNotifications').textContent=localJa()?'ブラウザ通知：有効':'Browser notifications: enabled';
  message(authMsg,permission==='granted'?(localJa()?'ブラウザ通知を有効にしました。':'Browser notifications enabled.'):(localJa()?'通知は許可されませんでした。':'Notification permission was not granted.'))}catch(e){message(authMsg,errText(e))}
}
let selectedFriendId=null,selectedFriendName='',friendMessageChannel=null;
let reportTargetUserId=null,reportTargetMessageId=null,reportTargetPostId=null,blockedUserIds=new Set();
let followRealtimeChannel=null,followRealtimeUserId=null,notificationRealtimeChannel=null,notificationRealtimeUserId=null;
async function syncFollowRealtime(){
 const uid=currentUser?.id||null;
 if(followRealtimeUserId===uid&&followRealtimeChannel)return;
 if(followRealtimeChannel){try{await sb.removeChannel(followRealtimeChannel)}catch(e){}followRealtimeChannel=null}
 followRealtimeUserId=uid;if(!uid)return;
 const refresh=()=>{loadFriends();const term=$s('aqwUserSearch')?.value?.trim()||'';if(term.length>=2)searchUsers({preventDefault(){}})};
 followRealtimeChannel=sb.channel('aqw-follow-state-'+uid)
  .on('postgres_changes',{event:'*',schema:'public',table:'follows',filter:'follower_id=eq.'+uid},refresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'follows',filter:'following_id=eq.'+uid},refresh)
  .subscribe();
}
async function closeFriendConversation(){
 selectedFriendId=null;selectedFriendName='';
 if(friendMessageChannel){try{await sb.removeChannel(friendMessageChannel)}catch(e){}friendMessageChannel=null}
 const title=$s('aqwConversationTitle'),messages=$s('aqwMessages'),input=$s('aqwMessageInput'),send=$s('aqwSendMessage'),actions=$s('aqwChatActions');
 if(title)title.textContent=localJa()?'チャットする相手を選択してください':'Select a conversation';
 if(messages)messages.replaceChildren();if(input)input.disabled=true;if(send)send.disabled=true;
 if(actions)actions.classList.add('hidden');
 closeReportPanel();
}
async function loadFriends(){
 const box=$s('aqwFriends');if(!box||!currentUser)return;
 box.textContent=localJa()?'フレンドを読み込み中…':'Loading friends…';
 const {data:blockedRows,error:blockError}=await sb.from('user_blocks').select('blocked_id').eq('blocker_id',currentUser.id);
 if(blockError){box.textContent=errText(blockError);return}
 const blockedIds=new Set((blockedRows||[]).map(x=>x.blocked_id));
 await loadBlockedUsers();
 const {data:outgoing,error:e1}=await sb.from('follows').select('following_id').eq('follower_id',currentUser.id);
 if(e1){box.textContent=errText(e1);return}
 const ids=(outgoing||[]).map(x=>x.following_id).filter(id=>id!==currentUser.id&&!blockedIds.has(id));
 if(!ids.length){box.textContent=localJa()?'まだフレンドがいません。ユーザー検索で相手を探し、お互いにフォローしてください。':'No friends yet. Search for a user and follow each other.';if(selectedFriendId)await closeFriendConversation();return}
 const {data:incoming,error:e2}=await sb.from('follows').select('follower_id').eq('following_id',currentUser.id).in('follower_id',ids);
 if(e2){box.textContent=errText(e2);return}
 const mutual=(incoming||[]).map(x=>x.follower_id).filter(id=>!blockedIds.has(id));
 if(!mutual.length){box.textContent=localJa()?'相互フォローのフレンドはいません。':'No mutual follows yet.';if(selectedFriendId)await closeFriendConversation();return}
 const {data:profiles,error:e3}=await sb.from('profiles').select('id,username,display_name,avatar_path').in('id',mutual).order('username');
 if(e3){box.textContent=errText(e3);return}
 box.replaceChildren();
 profiles.forEach(p=>{
  const row=document.createElement('div');row.className='aqw-user-row';
  row.append(makeAvatarElement(p.avatar_path,p.display_name||p.username));
  const label=document.createElement('span');label.className='user-label';label.textContent=(p.display_name||p.username)+' @'+p.username;
  const btn=document.createElement('button');btn.type='button';btn.textContent=localJa()?'チャットを開く':'Open chat';
  btn.onclick=()=>openFriendConversation(p.id,(p.display_name||p.username)+' @'+p.username);
  row.append(label,btn);box.append(row);
 });
 if(selectedFriendId&&!mutual.includes(selectedFriendId))await closeFriendConversation();
}
async function loadBlockedUsers(){
 const box=$s('aqwBlockedUsers');if(!box||!currentUser)return;
 const {data:rows,error}=await sb.from('user_blocks').select('blocked_id,created_at').eq('blocker_id',currentUser.id).order('created_at',{ascending:false});
 if(error){box.textContent=errText(error);return}
 blockedUserIds=new Set((rows||[]).map(row=>row.blocked_id));
 if(!rows?.length){box.textContent=localJa()?'ブロック中のユーザーはいません。':'No blocked users.';return}
 const ids=rows.map(row=>row.blocked_id);
 const {data:profiles,error:profileError}=await sb.from('profiles').select('id,username,display_name').in('id',ids);
 if(profileError){box.textContent=errText(profileError);return}
 const byId=new Map((profiles||[]).map(profile=>[profile.id,profile]));
 box.replaceChildren();
 rows.forEach(row=>{
  const profile=byId.get(row.blocked_id);
  const item=document.createElement('div');item.className='aqw-blocked-user-row';
  const label=document.createElement('span');
  label.textContent=profile?(profile.display_name||profile.username)+' @'+profile.username:(localJa()?'ユーザー情報を取得できません':'User profile unavailable');
  const button=document.createElement('button');button.type='button';button.textContent=localJa()?'ブロック解除':'Unblock';
  button.onclick=()=>unblockUser(row.blocked_id);
  item.append(label,button);box.append(item);
 });
}
async function blockUser(userId,userName=''){
 if(!currentUser||!userId||userId===currentUser.id)return;
 const label=userName||userId;
 const confirmed=window.confirm(localJa()?label+' をブロックしますか？相互フォローのチャットは停止します。':'Block '+label+'? Mutual-follow chat will be disabled.');
 if(!confirmed)return;
 const {error}=await sb.from('user_blocks').insert({blocker_id:currentUser.id,blocked_id:userId});
 if(error&&error.code!=='23505'){message($s('aqwMessageStatus')||postMsg,errText(error));return}
 const {error:followError}=await sb.from('follows').delete().eq('follower_id',currentUser.id).eq('following_id',userId);
 if(followError){message($s('aqwMessageStatus')||postMsg,localJa()?'ブロックしましたが、フォロー状態の更新に失敗しました。':'Blocked, but could not update the follow state.')}
 if(selectedFriendId===userId)await closeFriendConversation();
 await loadBlockedUsers();
 await loadFriends();
 await loadFeed();
 message($s('aqwMessageStatus')||postMsg,localJa()?'ユーザーをブロックしました。':'User blocked.');
}
async function blockSelectedFriend(){
 if(!selectedFriendId)return;
 await blockUser(selectedFriendId,selectedFriendName);
}
async function unblockUser(blockedId){
 if(!currentUser||!blockedId)return;
 const {error}=await sb.from('user_blocks').delete().eq('blocker_id',currentUser.id).eq('blocked_id',blockedId);
 if(error){message($s('aqwMessageStatus'),errText(error));return}
 await loadBlockedUsers();
 await loadFriends();
 await loadFeed();
 message($s('aqwMessageStatus'),localJa()?'ブロックを解除しました。':'Block removed.');
}
function openReportPanel(userId,messageId=null,postId=null){
 if(!currentUser||!userId)return;
 reportTargetUserId=userId;reportTargetMessageId=messageId;reportTargetPostId=postId;
 const panel=$s('aqwReportPanel');if(!panel)return;
 const submitButton=$s('aqwSubmitReport');if(submitButton)submitButton.disabled=false;
 panel.classList.remove('hidden');
 $s('aqwReportTitle').textContent=localJa()?(postId?'投稿を通報':messageId?'メッセージを通報':'ユーザーを通報'):(postId?'Report post':messageId?'Report message':'Report user');
 $s('aqwReportReasonLabel').textContent=localJa()?'理由':'Reason';
 $s('aqwReportDetailsLabel').textContent=localJa()?'補足（任意・500文字以内）':'Additional details (optional, up to 500 characters)';
 $s('aqwCancelReport').textContent=localJa()?'キャンセル':'Cancel';
 $s('aqwSubmitReport').textContent=localJa()?'通報する':'Submit report';
 const options=$s('aqwReportReason').options;
 const labels=localJa()?['嫌がらせ・迷惑行為','スパム','不適切な内容','その他']:['Harassment or abuse','Spam','Inappropriate content','Other'];
 [...options].forEach((option,index)=>{option.textContent=labels[index]||option.textContent});
 $s('aqwReportReason').value='other';$s('aqwReportDetails').value='';
 message($s('aqwReportStatus'),'');
 panel.scrollIntoView({behavior:'smooth',block:'center'});
}
function closeReportPanel(){
 const panel=$s('aqwReportPanel');if(panel)panel.classList.add('hidden');
 const submitButton=$s('aqwSubmitReport');if(submitButton)submitButton.disabled=false;
 reportTargetUserId=null;reportTargetMessageId=null;reportTargetPostId=null;
 const status=$s('aqwReportStatus');if(status)status.textContent='';
}
async function submitUserReport(){
 if(!currentUser||!reportTargetUserId)return;
 const reason=$s('aqwReportReason').value;
 const details=$s('aqwReportDetails').value.trim();
 const button=$s('aqwSubmitReport');button.disabled=true;
 try{
  const {error}=await sb.from('user_reports').insert({
   reporter_id:currentUser.id,
   reported_user_id:reportTargetUserId,
   message_id:reportTargetMessageId,
   post_id:reportTargetPostId,
   reason,
   details
  });
  if(error){
   message($s('aqwReportStatus'),error.code==='23505'
    ?(localJa()?'この内容はすでに通報されています。':'This item has already been reported.')
    :(localJa()?'通報できませんでした：':'Could not submit report: ')+errText(error));
   button.disabled=false;
   return;
  }
  message($s('aqwReportStatus'),localJa()?'通報を受け付けました。':'Report submitted.');
 }catch(error){
  message($s('aqwReportStatus'),(localJa()?'通報できませんでした：':'Could not submit report: ')+errText(error));
  button.disabled=false;
 }
}
async function openFriendConversation(friendId,friendName){
 if(!currentUser)return;
 const input=$s('aqwMessageInput'),send=$s('aqwSendMessage');
 input.disabled=true;send.disabled=true;message($s('aqwMessageStatus'),localJa()?'フレンド状態を確認中…':'Checking friendship…');
 const {data:ownBlock,error:blockError}=await sb.from('user_blocks').select('blocked_id').eq('blocker_id',currentUser.id).eq('blocked_id',friendId).maybeSingle();
 if(blockError){message($s('aqwMessageStatus'),errText(blockError));return}
 if(ownBlock){message($s('aqwMessageStatus'),localJa()?'このユーザーはブロック中です。ブロック一覧から解除してください。':'This user is blocked. Unblock them from your blocked list.');return}
 const [outgoing,incoming]=await Promise.all([
  sb.from('follows').select('following_id').eq('follower_id',currentUser.id).eq('following_id',friendId).maybeSingle(),
  sb.from('follows').select('follower_id').eq('follower_id',friendId).eq('following_id',currentUser.id).maybeSingle()
 ]);
 if(outgoing.error||incoming.error){message($s('aqwMessageStatus'),errText(outgoing.error||incoming.error));return}
 if(!outgoing.data||!incoming.data){await closeFriendConversation();message($s('aqwMessageStatus'),localJa()?'相互フォローが成立していないため、チャットできません。':'Chat is available only between mutual follows.');return}
 if(friendMessageChannel){try{await sb.removeChannel(friendMessageChannel)}catch(e){}friendMessageChannel=null}
 selectedFriendId=friendId;selectedFriendName=friendName;
 $s('aqwConversationTitle').textContent=friendName;input.disabled=false;send.disabled=false;
 const actions=$s('aqwChatActions');if(actions)actions.classList.remove('hidden');
 $s('aqwBlockFriend').textContent=localJa()?'ブロック':'Block';
 $s('aqwReportFriend').textContent=localJa()?'ユーザーを通報':'Report user';
 const uid=currentUser.id;
 friendMessageChannel=sb.channel('aqw-friend-chat-'+uid+'-'+friendId)
  .on('postgres_changes',{event:'*',schema:'public',table:'friend_messages',filter:'sender_id=eq.'+uid},payload=>{if(selectedFriendId===friendId)loadMessages()})
  .on('postgres_changes',{event:'*',schema:'public',table:'friend_messages',filter:'recipient_id=eq.'+uid},payload=>{if(selectedFriendId===friendId)loadMessages()})
  .subscribe();
 message($s('aqwMessageStatus'),localJa()?'リアルタイムチャットに接続しています。':'Connecting to live chat…');
 await loadMessages();
}
async function loadMessages(){
 const box=$s('aqwMessages');if(!selectedFriendId||!currentUser){box.textContent=localJa()?'フレンドを選択してください。':'Select a friend.';return}
 box.textContent=localJa()?'コメントを読み込み中…':'Loading comments…';
 const uid=currentUser.id,fid=selectedFriendId;
 const {data,error}=await sb.from('friend_messages').select('id,sender_id,recipient_id,body,created_at').or('and(sender_id.eq.'+uid+',recipient_id.eq.'+fid+'),and(sender_id.eq.'+fid+',recipient_id.eq.'+uid+')').order('created_at',{ascending:false}).limit(200);
 if(error){box.textContent=(localJa()?'チャットを利用できません。相互フォローやブロック設定を確認してください。':'This chat is unavailable. Check mutual-follow and block settings.');return}
 box.replaceChildren();
 if(!data?.length){box.textContent=localJa()?'まだメッセージはありません。送信できない場合は、相互フォローやブロック設定を確認してください。':'No messages yet. If sending is unavailable, check mutual-follow and block settings.';return}
 [...data].reverse().forEach(m=>{
  const item=document.createElement('article');item.className='aqw-post';
  const meta=document.createElement('small');meta.textContent=(m.sender_id===uid?(localJa()?'あなた':'You'):selectedFriendName)+' · '+stamp(m.created_at);
  const body=document.createElement('p');body.className='aqw-post-body';body.textContent=m.body;item.append(meta,body);
  if(m.sender_id===uid){
   const del=document.createElement('button');del.type='button';del.className='danger-button';del.textContent=localJa()?'削除':'Delete';
   del.onclick=async()=>{const {error:de}=await sb.from('friend_messages').delete().eq('id',m.id);if(de)message($s('aqwMessageStatus'),errText(de));else await loadMessages()};
   item.append(del);
  }else{
   const actions=document.createElement('div');actions.className='aqw-message-actions';
   const report=document.createElement('button');report.type='button';report.textContent=localJa()?'通報':'Report';
   report.onclick=()=>openReportPanel(m.sender_id,m.id);
   actions.append(report);item.append(actions);
  }
  box.append(item);
 });
 box.scrollTop=box.scrollHeight;
}
async function sendFriendMessage(e){
 e.preventDefault();if(!currentUser||!selectedFriendId)return;
 const input=$s('aqwMessageInput'),body=input.value.trim(),button=$s('aqwSendMessage');if(!body)return;
 button.disabled=true;message($s('aqwMessageStatus'),localJa()?'送信中…':'Sending…');
 try{
  const {error}=await sb.from('friend_messages').insert({sender_id:currentUser.id,recipient_id:selectedFriendId,body});
  if(error){message($s('aqwMessageStatus'),error.code==='42501'?(localJa()?'この相手とのチャットは利用できません。':'Chat is unavailable for this user.'):(localJa()?'送信できませんでした：':'Could not send: ')+errText(error));return}
  input.value='';message($s('aqwMessageStatus'),localJa()?'送信しました。':'Sent.');await loadMessages();
 }catch(error){
  message($s('aqwMessageStatus'),(localJa()?'送信できませんでした：':'Could not send: ')+errText(error));
 }finally{button.disabled=false}
}

function officialAnimeLink(anime){
 const url=getSearchAnimeOfficialUrl(anime);
 const isSearch=url.startsWith('https://www.google.com/search?');
 return {url,kind:isSearch?'search':'official'};
}
function renderFeaturedRail(source){
 const root=document.getElementById('featuredRail');if(!root)return;
 const candidates=shuffle(uniqueAnimeById(source).filter(a=>isUsableAnime(a))).slice(0,8);
 if(!candidates.length){root.innerHTML='<p class="featured-empty">今シーズンの日本アニメ画像を取得できませんでした。</p>';return}
 const makeTrack=(items,reverse=false)=>{
  const track=document.createElement('div');track.className='featured-track'+(reverse?' reverse':'');
  for(const anime of [...items,...items]){
   const link=officialAnimeLink(anime),card=document.createElement('a');
   card.className='featured-card'+(link.kind==='search'?' is-search-link':'');
   card.href=link.url;card.target='_self';card.rel='noopener noreferrer';
   card.title=link.kind==='official'?'公式サイトを新しいタブで開く':'公式サイトを検索（検索結果から公式ページを選択）';
   const image=document.createElement('img');image.src=anime.coverImage?.large||anime.coverImage?.medium||'';image.alt=titleOf(anime);image.loading='lazy';image.decoding='async';
   const label=document.createElement('span');label.textContent=titleOf(anime)+(link.kind==='search'?' · 公式サイトを検索':'');card.append(image,label);
   track.append(card);
  }
  return track;
 };
 // 下段は上段の作品順をランダムな位置だけ循環シフトし、同じ横位置に同じ作品が並ぶのを防ぐ
 const offset=candidates.length>1?1+Math.floor(Math.random()*(candidates.length-1)):0;
 const staggered=[...candidates.slice(offset),...candidates.slice(0,offset)];
 root.replaceChildren(makeTrack(candidates),makeTrack(staggered,true));
 // Keep the off-screen marquee paused to reduce mobile CPU and GPU work.
 if(root._aqwVisibilityObserver)root._aqwVisibilityObserver.disconnect();
 if(root._aqwVisibilityHandler)document.removeEventListener('visibilitychange',root._aqwVisibilityHandler);
 let railVisible=!('IntersectionObserver' in window);
 const tracks=()=>root.querySelectorAll('.featured-track');
 const syncRailAnimation=()=>tracks().forEach(track=>track.style.animationPlayState=railVisible&&!document.hidden?'running':'paused');
 if('IntersectionObserver' in window){
  syncRailAnimation();
  root._aqwVisibilityObserver=new IntersectionObserver(entries=>{
   railVisible=entries.some(entry=>entry.isIntersecting);
   syncRailAnimation();
  },{threshold:0.05});
  root._aqwVisibilityObserver.observe(root);
 }
 root._aqwVisibilityHandler=syncRailAnimation;
 document.addEventListener('visibilitychange',root._aqwVisibilityHandler);
 // ホバー・キーボード操作時は一時停止し、一定時間後に自動再開する
 let resumeTimer=null;
 const resume=()=>{if(resumeTimer)clearTimeout(resumeTimer);syncRailAnimation();resumeTimer=null};
 const pauseBriefly=()=>{if(resumeTimer)clearTimeout(resumeTimer);tracks().forEach(track=>track.style.animationPlayState='paused');resumeTimer=setTimeout(resume,2200)};
 root.onpointerenter=pauseBriefly;
 root.onpointerleave=resume;
 root.onfocusin=pauseBriefly;
 root.onfocusout=resume;
}
function getCurrentAnimeSeason(date=new Date()){
 // ブラウザーの設定地域に依存せず、日本時間でシーズンを判定する
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric'}).formatToParts(date);
 const year=Number(parts.find(part=>part.type==='year')?.value);
 const month=Number(parts.find(part=>part.type==='month')?.value);
 if(month<=3)return {season:'WINTER',label:'冬',year};
 if(month<=6)return {season:'SPRING',label:'春',year};
 if(month<=9)return {season:'SUMMER',label:'夏',year};
 return {season:'FALL',label:'秋',year};
}
async function loadFeaturedRail(){
 const root=document.getElementById('featuredRail');if(!root)return;
 const current=getCurrentAnimeSeason();
 const cacheKey='aqw-featured-season-v8-'+current.year+'-'+current.season;
 const cacheMaxAge=24*60*60*1000;
 const renderItems=items=>{
  const unique=new Map();
  for(const anime of items||[]){
   if(!isJapaneseOriginAnime(anime)||!Number.isFinite(Number(anime.id)))continue;
   const year=Number(anime.startDate?.year),month=Number(anime.startDate?.month);
   const belongs=Number(anime.seasonYear)===current.year&&anime.season===current.season;
   const dateFallback=year===current.year&&month>=({WINTER:1,SPRING:4,SUMMER:7,FALL:10}[current.season])&&month<=({WINTER:3,SPRING:6,SUMMER:9,FALL:12}[current.season]);
   if(belongs||dateFallback)unique.set(Number(anime.id),anime);
  }
  if(unique.size)renderFeaturedRail([...unique.values()]);
  return unique.size;
 };
 let cached=null,savedAt=0;
 try{
  const saved=JSON.parse(localStorage.getItem(cacheKey)||'null');
  if(saved&&Array.isArray(saved.items)){
   cached=saved.items;savedAt=Number(saved.savedAt)||0;
   renderItems(cached);
   if(Date.now()-savedAt<cacheMaxAge)return;
  }
 }catch(error){console.warn('Featured anime cache unavailable:',error)}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
 try{
  // 今シーズンの作品だけを取得し、関連作品情報など表示に不要なデータは要求しない。
  const fields='id countryOfOrigin popularity source(version:2) relations { edges { relationType node { id type countryOfOrigin format } } } format season seasonYear startDate { year month day } title { romaji english native } synonyms coverImage { extraLarge large medium } externalLinks { url site type isDisabled language }';
  const queryText='query { Page(page:1,perPage:24) { media(type:ANIME,season:'+current.season+',seasonYear:'+current.year+',format_in:[TV,ONA],isAdult:false,sort:POPULARITY_DESC) { '+fields+' } } }';
  const response=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query:queryText}),signal:controller.signal});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const json=await response.json();
  if(json.errors?.length)throw new Error(json.errors.map(e=>e.message).join(' / '));
  const items=normalizeUnicode(json.data?.Page)?.media||[];
  const count=renderItems(items);
  if(count){
   try{localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),items}));}catch(error){console.warn('Featured anime cache save failed:',error)}
  }else if(!cached){
   root.innerHTML='<p class="featured-empty">今シーズンの日本アニメ画像を取得できませんでした。</p>';
  }
 }catch(error){
  console.warn('Seasonal anime rail loading failed:',error);
  if(!cached)root.innerHTML='<p class="featured-empty">今シーズンの日本アニメを読み込めませんでした。通信状態を確認して再読み込みしてください。</p>';
 }finally{clearTimeout(timeout)}
}

// Defer the seasonal rail until after the initial page load and an idle period.
function scheduleFeaturedRail(){
 const run=()=>{if(!document.hidden)loadFeaturedRail()};
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:4000});
 else setTimeout(run,1800);
}
if(document.readyState==='complete')scheduleFeaturedRail();
else window.addEventListener('load',scheduleFeaturedRail,{once:true});
let aqwSupabaseFeaturesPromise=null;
window.aqwOpenSocialFeatures=async()=>{
 if(!sb)return;
 const {data,error}=await sb.auth.getSession();
 if(error)throw error;
 await refreshSession(data.session);
};
window.aqwEnsureSupabaseFeatures=()=>{
 if(aqwSupabaseFeaturesPromise)return aqwSupabaseFeaturesPromise;
 aqwSupabaseFeaturesPromise=(async()=>{
const supabaseReady=await initSupabase();
// Register the login form's unavailable-service response even when the SDK fails to load.
// This keeps the form responsive instead of leaving its submit button inert.
// Load optional global difficulty feedback after the first render, not during startup.
if(supabaseReady){
 const loadDifficultyFeedback=()=>{if(!document.hidden)loadQuestionDifficultyStats()};
 if('requestIdleCallback' in window)requestIdleCallback(loadDifficultyFeedback,{timeout:1500});
 else setTimeout(loadDifficultyFeedback,1200);
}
const authForm=$s('aqwAuthForm');
const authEmailInput=$s('aqwEmail'),authPasswordInput=$s('aqwPassword');
authForm.noValidate=true;
authForm.addEventListener('submit',e=>{
 e.preventDefault();
 message(authMsg,'');
 const email=authEmailInput.value.trim(),password=authPasswordInput.value;
 if(!email||!password){
  message(authMsg,localJa()?'メールアドレスとパスワードの両方を入力してください。':'Enter both your email address and password.');
  return;
 }
 if(!authEmailInput.checkValidity()){
  message(authMsg,localJa()?'メールアドレスの形式を確認してください。':'Check the email address format.');
  authEmailInput.focus();return;
 }
 if(password.length<(signupMode?12:8)){
  message(authMsg,signupMode?(localJa()?'パスワードは12文字以上必要です。':'Password must be at least 12 characters.'):(localJa()?'パスワードは8文字以上必要です。':'Password must be at least 8 characters.'));
  authPasswordInput.focus();return;
 }
 if(!supabaseReady||!sb){
  message(authMsg,localJa()?'ログイン機能を読み込めませんでした。ページを再読み込みしてください。':'The sign-in service could not be loaded. Reload the page and try again.');
  return;
 }
 authAction(signupMode?'signup':'signin');
});
if(!supabaseReady){aqwSupabaseFeaturesPromise=null;return}
$s('aqwSignUp').addEventListener('click',()=>setAuthMode(!signupMode));
$s('aqwForgotPassword').addEventListener('click',async()=>{const emailInput=$s('aqwEmail'),email=emailInput.value.trim(),button=$s('aqwForgotPassword');message(authMsg,'');if(!email||!emailInput.checkValidity()){message(authMsg,localJa()?'先に登録時のメールアドレスを正しく入力してください。':'Enter the email address associated with your account.');emailInput.focus();return}button.disabled=true;try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;message(authMsg,localJa()?'該当するアカウントがある場合、再設定メールを送信しました。メールをご確認ください。':'If an account exists for this address, a password reset email has been sent. Check your inbox.')}catch(error){message(authMsg,(localJa()?'再設定メールを送信できませんでした：':'Could not send the reset email: ')+errText(error))}finally{button.disabled=false}});
$s('aqwPasswordForm').addEventListener('submit',async e=>{e.preventDefault();const next=$s('aqwNewPassword').value,confirmPassword=$s('aqwConfirmPassword').value;message($s('aqwPasswordMessage'),'');if(!strongPassword(next)){message($s('aqwPasswordMessage'),localJa()?'新しいパスワードは12文字以上とし、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。':'Use 12–128 characters with at least one uppercase letter, lowercase letter, number and symbol.');return}if(next!==confirmPassword){message($s('aqwPasswordMessage'),localJa()?'確認用パスワードが一致しません。':'Passwords do not match.');return}const button=$s('aqwPasswordForm').querySelector('button[type="submit"]');button.disabled=true;try{const {error}=await sb.auth.updateUser({password:next});if(error)throw error;$s('aqwNewPassword').value='';$s('aqwConfirmPassword').value='';message($s('aqwPasswordMessage'),localJa()?'パスワードを変更しました。':'Password changed successfully.')}catch(err){message($s('aqwPasswordMessage'),(localJa()?'変更できませんでした：':'Could not change password: ')+errText(err))}finally{button.disabled=false}});
$s('aqwSignOut').addEventListener('click',async()=>{const {error}=await sb.auth.signOut();if(error)message(authMsg,errText(error));else message(authMsg,localJa()?'ログアウトしました。':'Signed out.')});
sb.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION')return;setTimeout(()=>{refreshSession(session).then(()=>{if(event==='PASSWORD_RECOVERY'){message($s('aqwPasswordMessage'),localJa()?'新しいパスワードを設定してください。':'Set your new password below.');$s('aqwPasswordForm').scrollIntoView({behavior:'smooth',block:'center'});$s('aqwNewPassword').focus()}}).catch(error=>setStatus(errText(error)))},0)});
await sb.auth.getSession().then(({data,error})=>{if(error)setStatus(errText(error));else refreshSession(data.session,{light:true})});
$s('aqwProfileForm').addEventListener('submit',async e=>{e.preventDefault();if(!currentUser)return;const username=$s('aqwEditUsername').value.trim();if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){message(authMsg,localJa()?'ユーザー名は半角英数字と _ の3〜24文字にしてください。':'Username must be 3–24 characters using letters, numbers, and underscores.');return}const button=$s('aqwProfileForm').querySelector('button[type=submit]');button.disabled=true;try{let avatarPath=currentProfile?.avatar_path||null;const file=$s('aqwAvatarFile').files?.[0];if(file){const newPath=await uploadAvatar(file);const oldPath=avatarPath;avatarPath=newPath;const {error}=await sb.from('profiles').update({username,display_name:$s('aqwEditDisplayName').value.trim(),bio:$s('aqwBio').value.trim(),avatar_path:avatarPath,updated_at:new Date().toISOString()}).eq('id',currentUser.id);if(error){await removeStoredAvatar(newPath);throw error}await removeStoredAvatar(oldPath)}else{const {error}=await sb.from('profiles').update({username,display_name:$s('aqwEditDisplayName').value.trim(),bio:$s('aqwBio').value.trim(),updated_at:new Date().toISOString()}).eq('id',currentUser.id);if(error)throw error}message(authMsg,rt('profileSave'));await refreshSession({user:currentUser});await Promise.all([loadRushLeaderboard(),loadPlayerLeaderboard()])}catch(error){message(authMsg,errText(error))}finally{button.disabled=false}});
$s('aqwAvatarFile').addEventListener('change',()=>{const file=$s('aqwAvatarFile').files?.[0];if(!file){updateAvatarPreview(currentProfile?.avatar_path||null);return}if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){message(authMsg,file.size>5*1024*1024?rt('imageTooLarge'):rt('imageType'));$s('aqwAvatarFile').value='';return}const image=$s('aqwAvatarPreviewImage');image.src=URL.createObjectURL(file);image.classList.remove('hidden');$s('aqwAvatarFallback').classList.add('hidden')});
$s('aqwRemoveAvatar').addEventListener('click',async()=>{if(!currentUser||!currentProfile?.avatar_path)return;if(!confirm(localJa()?'プロフィールアイコンを削除しますか？':'Remove your profile picture?'))return;const path=currentProfile.avatar_path;const {error}=await sb.from('profiles').update({avatar_path:null,updated_at:new Date().toISOString()}).eq('id',currentUser.id);if(error){message(authMsg,errText(error));return}await removeStoredAvatar(path);currentProfile.avatar_path=null;$s('aqwAvatarFile').value='';updateAvatarPreview(null);message(authMsg,localJa()?'アイコンを削除しました。':'Profile picture removed.');await Promise.all([loadRushLeaderboard(),loadPlayerLeaderboard()])});
$s('aqwPostForm').addEventListener('submit',e=>{e.preventDefault();doPost()});
$s('aqwShareQuiz').addEventListener('click',()=>{let h=[];try{h=JSON.parse(safeStorage.getItem('aqw-history')||'[]')}catch{}const runs=safeStorage.getItem('aqw-total-runs')||'0',xp=safeStorage.getItem('aqw-xp')||'0',t=({ja:['AQWクイズ記録','プレイ回数：','経験値：','最近の記録：'],en:['AQW quiz record','Plays: ','XP: ','Recent records: '],ko:['AQW 퀴즈 기록','플레이 횟수: ','경험치: ','최근 기록: '],zh:['AQW 答题记录','游玩次数：','经验值：','最近记录：'],es:['Registro del cuestionario AQW','Partidas: ','Experiencia: ','Registros recientes: '],fr:['Résultat du quiz AQW','Parties jouées : ','Expérience : ','Résultats récents : '],pt:['Registro de quiz AQW','Partidas: ','Experiência: ','Registros recentes: '],de:['AQW-Quizrekord','Gespielte Quizze: ','Erfahrungspunkte: ','Letzte Ergebnisse: ']})[lang]||['AQW quiz record','Plays: ','XP: ','Recent records: '];$s('aqwPostBody').value=t[0]+'\n'+t[1]+runs+'\n'+t[2]+xp+'\n'+(h.length?t[3]+JSON.stringify(h.slice(-3)):'')+'\n#AQW';$s('aqwPostBody').focus()});
$s('aqwRefreshFeed').addEventListener('click',loadFeed);
$s('aqwRefreshFriends').addEventListener('click',loadFriends);
$s('aqwRefreshMatchProfile').addEventListener('click',loadMyMatchProfile);
$s('aqwBlockFriend').addEventListener('click',blockSelectedFriend);
$s('aqwReportFriend').addEventListener('click',()=>{if(selectedFriendId)openReportPanel(selectedFriendId,null)});
$s('aqwCancelReport').addEventListener('click',closeReportPanel);
$s('aqwSubmitReport').addEventListener('click',submitUserReport);
$s('aqwMessageForm').addEventListener('submit',sendFriendMessage);
$s('aqwUserSearchForm').addEventListener('submit',searchUsers);
$s('aqwNotificationsButton').addEventListener('click',async()=>{$s('aqwNotifications').classList.toggle('hidden');if(!$s('aqwNotifications').classList.contains('hidden'))await loadNotifications()});
$s('aqwEnableBrowserNotifications').addEventListener('click',enableBrowserNotifications);
$s('aqwRushBoardRefresh').addEventListener('click',()=>loadRushLeaderboard(true));
$s('aqwRushBoardPeriod').addEventListener('change',()=>loadRushLeaderboard(true));
$s('aqwPlayerBoardRefresh').addEventListener('click',()=>loadPlayerLeaderboard(true));
$s('aqwPlayerBoardSort').addEventListener('change',()=>loadPlayerLeaderboard(true));
$s('aqwPlayerBoardPeriod').addEventListener('change',()=>loadPlayerLeaderboard(true));
$s('aqwRushBoardShare').addEventListener('click',shareRushBoardImage);
$s('aqwRushBoardSave').addEventListener('click',saveRushBoardImage);
$s('aqwPlayerBoardShare').addEventListener('click',sharePlayerBoardImage);
$s('aqwPlayerBoardSave').addEventListener('click',savePlayerBoardImage);
$s('aqwResetOnlineRecords').addEventListener('click',resetOnlineLeaderboardRecords);
$s('aqwToggleLeaderboardRegistration').addEventListener('click',toggleLeaderboardRegistration);

document.getElementById('languageSelect')?.addEventListener('change',()=>{applyRushLeaderboardLanguage();applyPlayerLeaderboardLanguage();applyMatchProfileLanguage();applyPeriodLabels();renderPlayerLeaderboard()});
window.addEventListener('aqw:quiz-finished',event=>{
 const detail=event.detail;
 if(!detail||!detail.runId||!Number.isInteger(detail.correctCount)||!Number.isInteger(detail.questionCount)||![10,15].includes(detail.xpMultiplier))return;
 submitPlayerRun(detail);
});
window.addEventListener('aqw:rush-finished',event=>{
 const detail=event.detail;
 if(!detail||!Number.isInteger(detail.correctCount)||!Number.isInteger(detail.questionCount)||!Number.isFinite(detail.elapsedMs))return;
 submitRushResult(detail);
});

applyRushLeaderboardLanguage();
applyPlayerLeaderboardLanguage();
applyMatchProfileLanguage();
applyPeriodLabels();
// Leaderboards are fetched only when the ranking tab is opened.
setStatus(localJa()?'ログインすると投稿・フォローなどのSNS機能を利用できます。':'Sign in to post and follow users.');
 })().catch(error=>{aqwSupabaseFeaturesPromise=null;console.error('AQW optional services initialization failed:',error);throw error});
 return aqwSupabaseFeaturesPromise;
};
if(/(?:^|[&#])type=recovery(?:&|$)/.test(location.hash))window.aqwEnsureSupabaseFeatures().catch(error=>console.warn('AQW password recovery initialization failed:',error));
})();
