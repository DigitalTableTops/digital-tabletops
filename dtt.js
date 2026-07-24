let socket = null;
let reconnectTimer = null;
let lockPan = false;
let panTimer = null;
let pixelWidth = 100;
let physicalScale = 1;

Hooks.once("init", () => {
	game.settings.register("digital-tabletops", "display-width", {
		name: "Physical Width of TV:",
		hint: "(either inches or mm)",
		scope: "world",
		config: true,
		type: Number,
		default: 955,
		onChange: (value) => {
			console.log("Updating the physical display width");
			game.socket.emit("module.digital-tabletops", { action: "updateDisplay" });
		},
	});

	game.settings.register("digital-tabletops", "port-number", {
		name: "Port Number:",
		hint: "(optional - for use with the external DigitalTableTops touch program)",
		scope: "world",
		config: true,
		type: Number,
		default: 50000,
		onChange: (value) => {
			console.log(`Port changed to: ${value}`);
			if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
				socket.disconnect();
			}
			if (game.user.name.toLowerCase() === "tv") {
				connectWebSocket();
			}
		},
	});

	game.settings.register("digital-tabletops", "hideUI", {
		name: "Hide TV UI",
		hint: "Hides the UI for the TV user.",
		scope: "world",
		config: false,
		type: Boolean,
		default: true,
		onChange: (value) => {
			console.log("Hiding the UI for TV user");
			game.socket.emit("module.digital-tabletops", { action: "hideUI" });
		},
	});

	game.settings.register("digital-tabletops", "lockPan", {
		name: "Lock panning",
		hint: "Lock panning due to token movement on TV.",
		scope: "world",
		config: false,
		type: Boolean,
		default: true,
		onChange: (value) => {
			console.log("Locking pan for TV user");
			game.socket.emit("module.digital-tabletops", { action: "lockPan" });
		},
	});
});

Hooks.once("ready", () => {
	if (game.user.isGM) {
		const displayWidth = game.settings.get("digital-tabletops", "display-width");
		new Dialog({
		title: "Digital TableTops",
		content: `<p>Welcome to the <strong>Digital TableTops</strong> module. It makes using a large format display (such as a TV, touchscreen, or projector) easier.</p><p>I sell such hardware on my website <a href="https://digitaltabletops.com" target="_blank">digitaltabletops.com</a>. If you are in the market for a wooden case to house a TV or an infrared touch frame, please consider purchasing from there. I have the lowest prices on the net! (short of DIY)</p><p>To use the module, log in as a user named "TV" on your large format display. Make sure they have ownership privileges for any tokens you want them to be able to control.</p><p>You will notice a new control group <i class="fa-solid fa-display"></i> in Foundry.</p><p><i class="fa-solid fa-eye"></i>: Toggles the visibility of the UI on the player view</p><p><i class="fa-solid fa-lock"></i>: Prevents token movement from causing the map to pan on the player view.</p><p><i class="fa-solid fa-expand-arrows-alt"></i>: Sets the scale level to 1 grid = 1 inch on the player view (note: you must set the physical display size below or in the modules settings)</p><p><i class="fa-solid fa-vector-square"></i>: Mirrors the GM's current view to the player view.</p><p><i class="fa-solid fa-crosshairs"></i>: Set the player view to coordinates clicked on inside the GM view.</p><p>Please enter the physical width of the display used as a player view (inches or mm):<input type="number" id="displayWidth" value="${displayWidth}" /></p><p>If you are using a compatible infrared touch screen, there is one more really neat trick: You can use the same computer as the GM view to control the touchscreen, without touch input stealing away the mouse cursor!</p><p>Due to limitations with Foundry's ability to communicate with USB peripherals, it requires an external program. Available on <a href="https://github.com/DigitalTableTops/digital-tabletops/releases/latest/download/DigitalTableTops.exe" target="_blank">Windows</a>, <a href="https://github.com/DigitalTableTops/digital-tabletops/releases/latest/download/DigitalTableTops.x86_64 " target="_blank">Linux</a>, and <a href="https://github.com/DigitalTableTops/digital-tabletops/releases/latest/download/MacClient.zip " target="_blank">Mac</a></p>`,
		buttons: {
		  ok: {
			label: "SAVE",
			callback: (html) => {
			  const value = html.find("#displayWidth").val();
			  game.settings.set("digital-tabletops", "display-width", Number(value));
			}
		  }
    }
  }).render(true);
	}
  
	if (game.user.name.toLowerCase() !== "tv") {
		console.log("Current user is not TV");
		return;
	}
	console.log("Digital TableTops module ready.");
	game.socket.on("module.digital-tabletops", (data) => {
		if (data.action === "panCanvas") {
			console.log("Received new map coordinates from GM");
			if (data.x !== undefined && data.y !== undefined) {
				if (data.targetWidth !== undefined && data.targetHeight !== undefined) {
					const scale = Math.min(canvas.app.screen.width / data.targetWidth, canvas.app.screen.height / data.targetHeight);
					canvas.pan({ x: data.x, y: data.y, scale: scale });
				} else {
					canvas.pan({ x: data.x, y: data.y });
				}
			}
			if (data.scale === "physical") {
				canvas.pan({ scale: physicalScale });
			}
		}
		if (data.action === "hideUI") {
			console.log("Toggling UI");
			hideUI();
		}
		if (data.action === "lockPan") {
			console.log("Locking panning");
			lockPan = game.settings.get("digital-tabletops", "lockPan");
		}
		if (data.action === "updateDisplay") {
			sendViewport();
			canvas.pan({ scale: physicalScale });
		}
	});

	if (canvas?.animatePan) {
		const originalAnimatePan = canvas.animatePan;
		canvas.animatePan = async function (options) {
			if (!lockPan) {
				console.log("Panning camera");
				return originalAnimatePan.apply(this, [options]);
			}
			console.log("Blocked camera pan");
			return Promise.resolve();
		};
	}
	connectWebSocket();
	hideUI();
	lockPan = game.settings.get("digital-tabletops", "lockPan");
});

Hooks.on("canvasReady", (canvas) => {
	if (game.user.name.toLowerCase() !== "tv") return;
	canvas.tokens.releaseAll();
	sendInitialData();
});

Hooks.on("getSceneControlButtons", (controls) => {
	if (!game.user.isGM) return;
	controls.tv = {
		name: "tv",
		title: "Digital TableTops Controls",
		icon: "fa-solid fa-display",
		layer: "tokens",
		tools: {
			hideUI: {
				name: "hideUI",
				title: "Toggle visibility of UI on TV",
				icon: "fa-solid fa-eye-slash",
				toggle: true,
				active: true,
				onChange: async (toggled) => {
					ui.notifications.info("Toggling visibility of UI on TV");
					const isHidden = ui.controls.controls.tv.tools.hideUI.active;
					game.settings.set("digital-tabletops", "hideUI", isHidden);
					const btn = document.querySelector('[data-tool="hideUI"]');
					if (btn) {
						btn.classList.remove("fa-eye", "fa-eye-slash");
						btn.classList.add(isHidden ? "fa-eye-slash" : "fa-eye");
					}
				},
			},
			lockPan: {
				name: "lockPan",
				title: "Prevent panning on TV due to token movement",
				icon: "fa-solid fa-lock",
				toggle: true,
				active: true,
				onChange: async (toggled) => {
					ui.notifications.info("Preventing panning on TV due to token movement");
					const isLocked = ui.controls.controls.tv.tools.lockPan.active;
					game.settings.set("digital-tabletops", "lockPan", isLocked);
					const btn = document.querySelector('[data-tool="lockPan"]');
					if (btn) {
						btn.classList.remove("fa-lock", "fa-lock-open");
						btn.classList.add(isLocked ? "fa-lock" : "fa-lock-open");
					}
				},
			},
			scaleTV: {
				name: "scaleTV",
				title: "Scale TV to 1 physical grid unit",
				icon: "fa-solid fa-expand-arrows-alt",
				button: true,
				onChange: () => {
					ui.notifications.info("Scaling TV to 1 physical grid unit");
					game.socket.emit("module.digital-tabletops", {
						action: "panCanvas",
						scale: "physical",
					});
				},
			},
			TV2GM: {
				name: "TV2GM",
				title: "Set TV view to the same as GM view (this screen)",
				icon: "fa-solid fa-vector-square",
				button: true,
				onChange: () => {
					ui.notifications.info("Setting TV view to the same as GM view (this screen)");
					const scale = canvas.stage.scale.x;
					const { x, y } = canvas.canvasCoordinatesFromClient({ x: 0.5 * canvas.app.screen.width, y: 0.5 * canvas.app.screen.height });
					game.socket.emit("module.digital-tabletops", {
						action: "panCanvas",
						x,
						y,
						targetWidth: canvas.app.screen.width / scale,
						targetHeight: canvas.app.screen.height / scale,
					});
				},
			},
			panTV: {
				name: "panTV",
				title: "Set TV view to a specific location",
				icon: "fa-solid fa-crosshairs",
				button: true,
				onChange: () => {
					ui.notifications.info("Click anywhere to pull TV view to that lcoation");
					document.getElementById("board").addEventListener(
						"click",
						(event) => {
							const { x, y } = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
							game.socket.emit("module.digital-tabletops", {
								action: "panCanvas",
								x,
								y,
							});
						},
						{ once: true },
					);
				},
			},
		},
	};
});

Hooks.on("createToken", async (tokenDocument, options, userId) => {
	sendTokens();
});

Hooks.on("updateToken", (tokenDocument, changes, options, userId) => {
	if (game.user.name.toLowerCase() !== "tv") return;

	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("Cannot update token. WebSocket is closed.");
		return;
	}

	if ("x" in changes || "y" in changes) {
		const movementData = {
			type: "TOKEN_MOVE",
			id: tokenDocument.id,
			x: changes.x !== undefined ? changes.x : tokenDocument.x,
			y: changes.y !== undefined ? changes.y : tokenDocument.y,
		};

		socket.send(JSON.stringify(movementData));
		//console.log("Sent movement update for token: ${tokenDocument.name}");
	}
});

Hooks.on("updateActor", (tokenDocument, changes, options, userId) => {
	if (game.user.name.toLowerCase() !== "tv") return;
	sendTokens();
});

Hooks.on("canvasPan", (canvas, panData) => {
	if (game.user.name.toLowerCase() !== "tv") return;
	if (!socket || socket.readyState !== WebSocket.OPEN) return;
	if (panTimer) {
		clearTimeout(panTimer);
		panTimer = null;
	}
	panTimer = setTimeout(() => {
		panTimer = null;
		sendViewport();
	}, 1000);
});

function connectWebSocket() {
	if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
		return;
	}

	const socketUrl = "ws://localhost:" + game.settings.get("digital-tabletops", "port-number");

	console.log(`Attempting to connect to ${socketUrl}...`);
	socket = new WebSocket(socketUrl);

	socket.onopen = (event) => {
		console.log("Connected successfully");
		sendInitialData();
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		socket.send(JSON.stringify({ type: "CONNECT", user: game.user.name }));
	};

	socket.onmessage = async (event) => {
		try {
			let textData = event.data instanceof Blob ? await event.data.text() : event.data;
			const data = JSON.parse(textData);
			//console.log("Received data:", data);

			if (!canvas || !canvas.ready || !canvas.scene) {
				console.warn("Canvas is not ready.");
				return;
			}
			if (data.type === "SET_ZOOM") {
				canvas.pan({ scale: data.zoom });
			}
			if (data.id !== undefined && data.x !== undefined && data.y !== undefined) {
				const tokenDocument = canvas.scene.tokens.get(data.id);
				if (tokenDocument) {
					if (tokenDocument.isOwner) {
						await tokenDocument.update(
							{
								x: data.x,
								y: data.y,
							},
							{ animate: false },
						);
					} else {
						console.warn("User lacks permission to move token");
					}
				} else {
					console.warn("Token not found on active scene.");
				}
			}
		} catch (err) {
			console.error("Error parsing message:", err);
		}
	};

	socket.onerror = (error) => {
		console.error("WebSocket error encountered.");
	};

	socket.onclose = (event) => {
		console.warn("Connection closed. Retrying in 2 seconds...");
		scheduleReconnect();
	};
}

function scheduleReconnect() {
	if (!reconnectTimer) {
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connectWebSocket();
		}, 2000);
	}
}

function hideUI() {
	const isHidden = game.settings.get("digital-tabletops", "hideUI");
	const styleId = "hide-ui-tv";
	let styleBlock = document.getElementById(styleId);

	if (!styleBlock) {
		styleBlock = document.createElement("style");
		styleBlock.id = styleId;
		if (isHidden) {
			styleBlock.innerHTML =
				"#ui-left, #ui-top, #ui-right, #ui-bottom, #players, #hotbar, #navigation, #controls, #sidebar, .vtt.game #logo { display: none !important; pointer-events: none !important; }";
			document.head.appendChild(styleBlock);
		} else {
			styleBlock.remove();
		}
	} else {
		styleBlock.remove();
	}
}

function sendInitialData() {
	if (!canvas || !canvas.ready || !canvas.tokens) {
		console.warn("Cannot send data: Map/Canvas is not loaded yet.");
		return;
	}
	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("Cannot send viewport: WebSocket is not open.");
		return;
	}
	sendTokens();
	sendViewport();
}

function sendTokens() {
	const tokenDataList = canvas.tokens.placeables.map((token) => {
		return {
			id: token.id,
			name: token.name,
			owner: token.document.isOwner,
			x: token.document.x,
			y: token.document.y,
			w: token.w,
			h: token.h,
		};
	});
	const message = {
		type: "INITIAL_TOKEN_COORDINATES",
		tokens: tokenDataList,
	};
	socket.send(JSON.stringify(message));
}
function sendViewport() {
	if (!canvas || !canvas.ready) return null;
	if (pixelWidth < canvas.app.screen.width) {
		pixelWidth = canvas.app.screen.width;
	}
	if (game.settings.get("digital-tabletops", "display-width") > 100)
	{
		physicalScale = 25 * pixelWidth / game.settings.get("digital-tabletops", "display-width") / canvas.dimensions.size;
	}
	else{
		physicalScale = pixelWidth / game.settings.get("digital-tabletops", "display-width") / canvas.dimensions.size;
	}
	//ui.notifications.info(`${pixelWidth}`);
	//ui.notifications.info(`${physicalScale}`);

	if (!socket || socket.readyState !== WebSocket.OPEN) {
		console.warn("Cannot send viewport: WebSocket is not open.");
		return;
	}

	const scale = canvas.stage.scale.x;
	const message = {
		type: "MAP_VIEWPORT_BOUNDS",
		left: canvas.canvasCoordinatesFromClient({ x: 0, y: 0 }).x,
		top: canvas.canvasCoordinatesFromClient({ x: 0, y: 0 }).y,
		width: canvas.app.screen.width / scale,
		height: canvas.app.screen.height / scale,
	};
	socket.send(JSON.stringify(message));
}
