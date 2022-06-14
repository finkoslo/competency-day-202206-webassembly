(async function () {
	let rightNow = Date.now().toString();
	let sha256 = new WasmSHA256();

	let difficulty = 5;

	async function digestMessage(message) {
		const encoder = new TextEncoder();
		const data = encoder.encode(message);
		const hash = await crypto.subtle.digest('SHA-256', data);
		return toHexString(new Uint8Array(hash))
	}

	function toHexString(byteArray) {
		return Array.from(byteArray, function (byte) {
			return ('0' + (byte & 0xFF).toString(16)).slice(-2);
		}).join('')
	}

	class Blockchain {
		constructor(initialBlock) {
			// Create our genesis block
			this.chain = [initialBlock];
		}

		getLastBlock() {
			return this.chain[this.chain.length - 1];
		}

		async addBlock(block) {
			block.prevHash = this.getLastBlock().hash;
			block.hash = await getHash(block);
			await block.mine(difficulty);
			this.chain.push(Object.freeze(block));
		}


		async isValid(blockchain = this) {
			// Iterate over the chain, we need to set i to 1 because there are nothing before the genesis block, so we start at the second block.
			for (let i = 1; i < blockchain.chain.length; i++) {
				const currentBlock = blockchain.chain[i];
				const prevBlock = blockchain.chain[i - 1];

				// Check validation
				if (currentBlock.hash !== await getHash(currentBlock) || prevBlock.hash !== currentBlock.prevHash) {
					return false;
				}
			}

			return true;
		}
	}

	// Our hash function.
	async function getHash(block) {
		const hash = await digestMessage(block.prevHash + block.timestamp + JSON.stringify(block.data) + block.nonce);
		return hash
	}

	// Our hash function.
	async function getHashWS(block) {
		const hash = await sha256.hashString(block.prevHash + block.timestamp + JSON.stringify(block.data) + block.nonce);
		return hash
	}

	class Block {
		constructor(timestamp = "", data = [], mode = 'js' || 'ws') {
			this.timestamp = timestamp;
			this.data = data;
			this.hash = ""
			this.prevHash = ""; // previous block's hash
			this.nonce = 0;
			this.mode = mode
		}


		async mine(difficulty) {
			let it = 0;
			// Basically, it loops until our hash starts with
			// the string 0...000 with length of <difficulty>.
			while (!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
				// We increases our nonce so that we can get a whole different hash.
				this.nonce++;
				// Update our new hash with the new nonce value.
				if (this.mode === 'ws') {
					this.hash = await getHashWS(this);
				} else {
					this.hash = await getHash(this);
				}
				
				it = it + 1;
			}
			console.log('Number of runs ', it)
		}
	}

	window.doBlockChainTest = async function (inDifficulty, callback) {

		difficulty = inDifficulty

		console.time("Timing")

		const initialBlock = new Block(rightNow, null, 'js')
		initialBlock.hash = await getHash(initialBlock)
		const theChain = new Blockchain(initialBlock);

		// Add a new block
		const block = new Block(rightNow, { from: "John", to: "Bob", amount: 100 }, 'js')
		block.hash = await getHash(block);
		console.debug("javascript.js:87", block)
		await theChain.addBlock(block);

		// (This is just a fun example, real cryptocurrencies often have some more steps to implement).

		// Prints out the updated chain

		console.log(theChain.chain);
		console.debug("javascript.js:97", "Difficulty:", difficulty)
		console.debug("javascript.js:97", theChain.chain[1].timestamp - theChain.chain[0].timestamp)

		console.timeEnd("Timing")

		callback(theChain)
	}

	window.doBlockChainTestWS = async function (inDifficulty, callback) {

		difficulty = inDifficulty

		console.time("Timing")

		const initialBlock = new Block(rightNow, null, 'ws')
		initialBlock.hash = await getHashWS(initialBlock)
		const theChain = new Blockchain(initialBlock);

		// Add a new block
		const block = new Block(rightNow, { from: "John", to: "Bob", amount: 100 }, 'ws')
		block.hash = await getHashWS(block);
		console.debug("javascript.js:131", block)

		await theChain.addBlock(block);

		// (This is just a fun example, real cryptocurrencies often have some more steps to implement).

		// Prints out the updated chain

		console.log(theChain.chain);
		console.debug("javascript.js:140", "Difficulty:", difficulty)
		console.debug("javascript.js:141", theChain.chain[1].timestamp - theChain.chain[0].timestamp)

		console.timeEnd("Timing")

		callback(theChain)
	}

	fetch("sha256.wasm?v=1.0.2")
		.then(res => res.arrayBuffer())
		.then(buffer => {
			sha256.loadWasmBuffer(buffer);

			sha256.on("ready", function () {
				console.log('wasm ready ')
			});
		});
})()

