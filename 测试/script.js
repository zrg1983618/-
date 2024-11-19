document.addEventListener('DOMContentLoaded', function() {
    const translateBtn = document.getElementById('translate-btn');
    const inputText = document.getElementById('input-text');
    const chineseOutput = document.getElementById('chinese-output');
    const phoneticText = document.getElementById('phonetic-text');
    const playSound = document.getElementById('play-sound');
    const commonPhrases = document.getElementById('common-phrases');
    const exampleSentences = document.getElementById('example-sentences');
    const translationCountDisplay = document.getElementById('translation-count');
    const historyList = document.getElementById('history-list');

    // 从 localStorage 获取历史数据
    let translationCount = parseInt(localStorage.getItem('translationCount') || '0');
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

    // 更新统计显示
    function updateStats() {
        translationCountDisplay.textContent = translationCount;
        localStorage.setItem('translationCount', translationCount.toString());
    }

    // 添加历史记录
    function addToHistory(text, translation) {
        // 检查是否已存在相同的单词或翻译
        const existingIndex = searchHistory.findIndex(item => 
            item.text.toLowerCase() === text.toLowerCase() || 
            item.translation === translation
        );
        
        if (existingIndex !== -1) {
            // 如果存在，删除旧记录
            searchHistory.splice(existingIndex, 1);
        }
        
        // 添加新记录到开头
        searchHistory.unshift({
            text: text,
            translation: translation
        });
        
        // 限制历史记录最多显示10条
        if (searchHistory.length > 10) {
            searchHistory.pop();
        }
        
        // 保存到 localStorage
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        updateHistoryDisplay();
    }

    // 更新历史记录显示
    function updateHistoryDisplay() {
        historyList.innerHTML = '';
        searchHistory.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-text">
                    <span class="history-original">${item.text}</span>
                    <span class="history-divider">-</span>
                    <span class="history-translation">${item.translation}</span>
                </div>
            `;
            
            // 点击历史记录可以重新翻译
            li.addEventListener('click', () => {
                inputText.value = item.text;
                translateBtn.click();
            });
            
            historyList.appendChild(li);
        });
    }

    // 创建提示元素
    const createPraiseMessage = () => {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, var(--primary-color), #2ecc71);
            color: white;
            padding: 20px 40px;
            border-radius: 20px;
            font-size: 1.2rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: fadeInOut 2s forwards;
            z-index: 1000;
        `;
        message.textContent = "张钰琪你好棒b(￣▽￣)d";
        document.body.appendChild(message);

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                30% { transform: translate(-50%, -50%) scale(1); }
                70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);

        // 2秒后移除提示
        setTimeout(() => {
            document.body.removeChild(message);
        }, 2000);
    };

    // 翻译按钮点击事件
    translateBtn.addEventListener('click', async function() {
        const text = inputText.value.trim();
        if (!text) return;

        try {
            // 1. 获取翻译
            const translationResponse = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
            );
            const translationData = await translationResponse.json();

            // 2. 获取单词详细信息
            const dictionaryResponse = await fetch(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`
            );
            const dictionaryData = await dictionaryResponse.json();

            if (translationData.responseStatus === 200) {
                const result = {
                    translation: translationData.responseData.translatedText,
                    phonetic: dictionaryData[0]?.phonetic || '',
                    phrases: extractPhrases(dictionaryData),
                    sentences: extractExamples(dictionaryData)
                };

                updateUI(result);

                // 更新统计和历史
                translationCount++;
                updateStats();
                addToHistory(text, result.translation);

                // 显示鼓励消息
                if (translationCount % 5 === 0) {
                    createPraiseMessage();
                }
            } else {
                throw new Error('翻译失败：' + translationData.responseStatus);
            }
        } catch (error) {
            console.error('翻译出错:', error);
            chineseOutput.textContent = '翻译出错，请稍后重试';
        }
    });

    // 提取词组
    function extractPhrases(data) {
        const phrases = [];  // 改用数组而不是 Set
        try {
            data[0]?.meanings.forEach(meaning => {
                // 如果已经有3个词组就停止
                if (phrases.length >= 3) return;
                
                // 从 definitions 中提取词组
                meaning.definitions.forEach(def => {
                    if (phrases.length >= 3) return;  // 检查数量
                    if (def.example && def.example.split(' ').length <= 4) {
                        phrases.push({
                            en: def.example,
                            zh: ''
                        });
                    }
                });
                
                // 从 synonyms 中提取词组
                if (meaning.synonyms && phrases.length < 3) {
                    meaning.synonyms.slice(0, 3 - phrases.length).forEach(synonym => {
                        phrases.push({
                            en: synonym,
                            zh: ''
                        });
                    });
                }
                
                // 从 antonyms 中提取
                if (meaning.antonyms && phrases.length < 3) {
                    meaning.antonyms.slice(0, 3 - phrases.length).forEach(antonym => {
                        phrases.push({
                            en: antonym,
                            zh: ''
                        });
                    });
                }
            });
        } catch (e) {
            console.error('提取词组时出错:', e);
        }
        return phrases.slice(0, 3);  // 确保只返回3个
    }

    // 提取例句
    function extractExamples(data) {
        const examples = [];  // 改用数组而不是 Set
        try {
            data[0]?.meanings.forEach(meaning => {
                if (examples.length >= 3) return;  // 如果已经有3个例句就停止
                
                meaning.definitions.forEach(def => {
                    if (examples.length >= 3) return;  // 检查数量
                    if (def.example) {
                        examples.push({
                            en: def.example,
                            zh: ''
                        });
                    }
                });
            });
        } catch (e) {
            console.error('提取例句时出错:', e);
        }
        return examples.slice(0, 3);  // 确保只返回3个
    }

    // 翻译文本的辅助函数
    async function translateText(text) {
        try {
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
            );
            const data = await response.json();
            return data.responseData.translatedText;
        } catch (error) {
            console.error('翻译出错:', error);
            return '';
        }
    }

    // 更新界面函数
    async function updateUI(data) {
        // 显示翻译结果
        chineseOutput.textContent = data.translation;
        
        // 显示音标
        phoneticText.textContent = data.phonetic ? `[${data.phonetic}]` : '';
        
        // 更新常用词组
        commonPhrases.innerHTML = '<h4>常用词组</h4>';
        if (data.phrases && data.phrases.length > 0) {
            const phrasesList = document.createElement('ul');
            phrasesList.className = 'phrases-list';
            
            // 添加原单词作为第一个词组
            const originalWordLi = document.createElement('li');
            originalWordLi.innerHTML = `
                <div class="phrase-en">${inputText.value.trim()}</div>
                <div class="phrase-zh">${data.translation}</div>
            `;
            phrasesList.appendChild(originalWordLi);
            
            // 为每个词组添加中文翻译
            for (const phrase of data.phrases) {
                const li = document.createElement('li');
                const translation = await translateText(phrase.en);
                li.innerHTML = `
                    <div class="phrase-en">${phrase.en}</div>
                    <div class="phrase-zh">${translation}</div>
                `;
                phrasesList.appendChild(li);
            }
            commonPhrases.appendChild(phrasesList);
        } else {
            commonPhrases.innerHTML += '<p>暂无相关词组</p>';
        }

        // 更新示例句子
        exampleSentences.innerHTML = '<h4>示例句子</h4>';
        if (data.sentences && data.sentences.length > 0) {
            const sentencesList = document.createElement('ul');
            sentencesList.className = 'sentences-list';
            
            // 为每个例句添加中文翻译
            for (const sentence of data.sentences) {
                const li = document.createElement('li');
                const translation = await translateText(sentence.en);
                li.innerHTML = `
                    <div class="sentence-en">${sentence.en}</div>
                    <div class="sentence-zh">${translation}</div>
                `;
                sentencesList.appendChild(li);
            }
            exampleSentences.appendChild(sentencesList);
        } else {
            exampleSentences.innerHTML += '<p>暂无示例句子</p>';
        }
    }

    // 播放声音按钮点击事件
    playSound.addEventListener('click', function() {
        const text = inputText.value.trim();
        if (text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    });

    // 支持回车键触发翻译
    inputText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            translateBtn.click();
        }
    });

    // 初始化显示
    updateStats();
    updateHistoryDisplay();
}); 