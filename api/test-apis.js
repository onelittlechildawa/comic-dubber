/**
 * API测试脚本
 * 使用方法: node test-apis.js [test-name]
 * 
 * 可用的测试:
 * - draw-comic: 测试漫画生成API
 * - chat: 测试聊天API
 * - all: 运行所有测试
 */

const API_BASE = 'http://localhost:3000';

// 测试漫画生成API
async function testDrawComic() {
    console.log('\n🎨 测试 /api/draw-comic...');

    try {
        const response = await fetch(`${API_BASE}/api/draw-comic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: '一只可爱的小猫在玩耍'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ draw-comic API 测试成功!');
        console.log('返回数据:', {
            hasImageUri: !!data.imageUri,
            imageUriPreview: data.imageUri ? data.imageUri.substring(0, 50) + '...' : null
        });

        return true;
    } catch (error) {
        console.error('❌ draw-comic API 测试失败:', error.message);
        return false;
    }
}

// 测试聊天API
async function testChat() {
    console.log('\n💬 测试 /api/chat...');

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: '请把这段文字改成更有趣的版本' }
                ],
                currentText: 'Male: 你好\nFemale: 你好啊'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ chat API 测试成功!');
        console.log('返回数据:', data);

        // 尝试解析返回的JSON文本
        try {
            const parsedText = JSON.parse(data.text);
            console.log('解析后的响应:');
            console.log('  回复:', parsedText.reply);
            console.log('  更新后的文本:', parsedText.updatedText);
        } catch (e) {
            console.log('原始文本:', data.text);
        }

        return true;
    } catch (error) {
        console.error('❌ chat API 测试失败:', error.message);
        return false;
    }
}

// 健康检查
async function testHealth() {
    console.log('\n🏥 测试健康检查...');

    try {
        const response = await fetch(`${API_BASE}/health`);

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 健康检查成功!', data);
        return true;
    } catch (error) {
        console.error('❌ 健康检查失败:', error.message);
        console.error('提示: 请确保开发服务器正在运行 (运行: node dev-server.js)');
        return false;
    }
}

// 主函数
async function main() {
    const testName = process.argv[2] || 'all';

    console.log('='.repeat(50));
    console.log('🧪 Comic Dubber API 测试工具');
    console.log('='.repeat(50));
    console.log(`API地址: ${API_BASE}`);

    // 先进行健康检查
    const healthOk = await testHealth();
    if (!healthOk) {
        process.exit(1);
    }

    const results = {};

    // 根据参数运行测试
    if (testName === 'all' || testName === 'draw-comic') {
        results.drawComic = await testDrawComic();
    }

    if (testName === 'all' || testName === 'chat') {
        results.chat = await testChat();
    }

    // 打印总结
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试总结:');
    console.log('='.repeat(50));

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.values(results).length;

    console.log(`通过: ${passed}/${total}`);
    Object.entries(results).forEach(([name, success]) => {
        console.log(`  ${success ? '✅' : '❌'} ${name}`);
    });

    process.exit(passed === total ? 0 : 1);
}

main();
