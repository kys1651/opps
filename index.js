// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// extract from chromium source code by @liuwayong
(function () {
    'use strict';
    /**
     * T-Rex runner.
     * @param {string} outerContainerId Outer containing element id.
     * @param {Object} opt_config
     * @constructor
     * @export
     */
    var flag = false;
    var booster = false;
    var Attackcount = 1;
    var beforeSpeed = 0;
    var hard = false;

    // 공룡 달리기 객체
    function Runner(outerContainerId, opt_config) {
        // Singleton
        // 상태 리턴해주기
        if (Runner.instance_) {
            return Runner.instance_;
        }
        Runner.instance_ = this;

        this.outerContainerEl = document.querySelector(outerContainerId);
        this.containerEl = null;
        this.snackbarEl = null;
        this.detailsButton = this.outerContainerEl.querySelector('#details-button');

        this.config = opt_config || Runner.config;

        this.dimensions = Runner.defaultDimensions;

        this.canvas = null;
        this.canvasCtx = null;

        this.tRex = null;

        // 거리 
        this.distanceMeter = null;
        this.distanceRan = 0;

        //최고 점수
        this.highestScore = 0;

        //시간, 달린 시간, 시간 당 프레임, 현재 속도
        this.time = 0;
        this.runningTime = 0;
        this.msPerFrame = 1000 / FPS;
        this.currentSpeed = this.config.SPEED;

        this.obstacles = [];


        // 이스터에그 활성화 여부
        this.activated = false; // Whether the easter egg has been activated.
        
        // 게임이 지금 플레이 상태인지 아닌지 여부
        this.playing = false; // Whether the game is currently in play state.
        
        // 부딪혔는지 아닌지 여부
        this.crashed = false;
        this.paused = false;
        this.inverted = false;
        this.invertTimer = 0;
        this.resizeTimerId_ = null;
        //플레이 횟수
        this.playCount = 0;

        // Sound FX.
        this.audioBuffer = null;
        this.soundFx = {};

        // Global web audio context for playing sounds.
        this.audioContext = null;

        // Images.
        this.images = {};
        this.imagesLoaded = 0;

        if (this.isDisabled()) {
            this.setupDisabledRunner();
        } else {
            this.loadImages();
        }
    }
    window['Runner'] = Runner;

    /**
     * Default game width. 기본 게임 폭
     * @const
     */
    var DEFAULT_WIDTH = 600;

    /**
     * Frames per second. 초당 프레임
     * @const
     */
    var FPS = 60; // 기본은 60으로 설정됨

    /** @const */
    var IS_HIDPI = window.devicePixelRatio > 1;

    /** @const */
    var IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);

    /** @const */
    var IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

    /** @const */
    var IS_TOUCH_ENABLED = 'ontouchstart' in window;

    /**
     * Default game configuration. 기본 게임 구성
     * @enum {number}
     */
    // 게임 구성은 코딩하면서 이해하기
    Runner.config = {
        ACCELERATION: 0.001, // 가속
        BG_CLOUD_SPEED: 0.2,
        BOTTOM_PAD: 10,
        CLEAR_TIME: 3000, // 클리어 시간
        CLOUD_FREQUENCY: 0.5,
        GAMEOVER_CLEAR_TIME: 750,
        GAP_COEFFICIENT: 0.6,
        GRAVITY: 0.6,//중력
        INITIAL_JUMP_VELOCITY: 12,
        attackVelocity: 5, // 공격 속도
        INVERT_FADE_DURATION: 12000,
        INVERT_DISTANCE: 700,
        MAX_BLINK_COUNT: 3,
        MAX_CLOUDS: 6,
        MAX_OBSTACLE_LENGTH: 3,
        MAX_OBSTACLE_DUPLICATION: 2,
        MAX_SPEED: 13,
        MIN_JUMP_HEIGHT: 35,
        MIN_ATTACK_DISTANCE: 20, // 최소 공격 거리
        MAX_ATTACK_DISTANCE: 35, // 최대 공격 거리
        MOBILE_SPEED_COEFFICIENT: 1.2,
        RESOURCE_TEMPLATE_ID: 'audio-resources',
        SPEED: 6,
        SPEED_DROP_COEFFICIENT: 3,
        ARCADE_MODE_INITIAL_TOP_POSITION: 35,
        ARCADE_MODE_TOP_POSITION_PERCENT: 0.1
    };


    /**
     * Default dimensions.
     * @enum {string}
     */
    //기본 차원 구성 default는 600으로 설정됨
    Runner.defaultDimensions = {
        WIDTH: DEFAULT_WIDTH,
        HEIGHT: 150
    };


    /**
     * CSS class names.
     * @enum {string}
     */
    // 러너 객체 생성
    Runner.classes = {
        ARCADE_MODE: 'arcade-mode',
        CANVAS: 'runner-canvas',
        CONTAINER: 'runner-container',
        CRASHED: 'crashed',
        ICON: 'icon-offline',
        INVERTED: 'inverted',
        SNACKBAR: 'snackbar',
        SNACKBAR_SHOW: 'snackbar-show',
        TOUCH_CONTROLLER: 'controller'
    };

    /**
     * Sprite definition layout of the spritesheet.
     * @enum {Object}
     */
    Runner.spriteDefinition = {
        LDPI: {
            CACTUS_LARGE: { x: 332, y: 2 },
            CACTUS_SMALL: { x: 228, y: 2 },
            CLOUD: { x: 86, y: 2 },
            HORIZON: { x: 2, y: 54 },
            MOON: { x: 484, y: 2 },
            PTERODACTYL: { x: 134, y: 2 },
            RESTART: { x: 2, y: 2 },
            TEXT_SPRITE: { x: 655, y: 2 },
            TREX: { x: 848, y: 2 },
            STAR: { x: 645, y: 2 }
        },
        HDPI: {
            CACTUS_LARGE: { x: 652, y: 2 },
            CACTUS_SMALL: { x: 446, y: 2 },
            CLOUD: { x: 166, y: 2 },
            HORIZON: { x: 2, y: 104 },
            MOON: { x: 954, y: 2 },
            PTERODACTYL: { x: 260, y: 2 },
            RESTART: { x: 2, y: 2 },
            TEXT_SPRITE: { x: 1294, y: 2 },
            TREX: { x: 1678, y: 2 },
            STAR: { x: 1276, y: 2 }
        }
    };


    /**
     * Sound FX. Reference to the ID of the audio tag on interstitial page.
     * @enum {string}
     */
    // 달릴 때 소리 설정
    Runner.sounds = {
        BUTTON_PRESS: 'offline-sound-press',
        HIT: 'offline-sound-hit',
        SCORE: 'offline-sound-reached'
    };


    /**
     * Key code mapping.
     * @enum {Object}
     */
    Runner.keycodes = {
        JUMP: { '38': 1, '32': 1 },  // Up, spacebar
        DUCK: { '40': 1 },  // Down
        RESTART: { '13': 1 },  // Enter
        ATTACK: { '65': 1}, // A: 공격하기 위한 버튼 생성 
    };


    /**
     * Runner event names.
     * @enum {string}
     */
    // 이벤트 발생 String
    Runner.events = {
        ANIM_END: 'webkitAnimationEnd',
        CLICK: 'click',
        KEYDOWN: 'keydown',
        KEYUP: 'keyup',
        MOUSEDOWN: 'mousedown',
        MOUSEUP: 'mouseup',
        RESIZE: 'resize',
        TOUCHEND: 'touchend',
        TOUCHSTART: 'touchstart',
        VISIBILITY: 'visibilitychange',
        BLUR: 'blur',
        FOCUS: 'focus',
        LOAD: 'load',
        ATTACK: 'attack'//공격 이벤트
    };


    Runner.prototype = {
        /**
         * Whether the easter egg has been disabled. CrOS enterprise enrolled devices.
         * @return {boolean}
         */
        isDisabled: function () {
            // return loadTimeData && loadTimeData.valueExists('disabledEasterEgg');
            return false;
        },
        
        /**
         * For disabled instances, set up a snackbar with the disabled message.
         */
        setupDisabledRunner: function () {
            this.containerEl = document.createElement('div');
            this.containerEl.className = Runner.classes.SNACKBAR;
            this.containerEl.textContent = loadTimeData.getValue('disabledEasterEgg');
            this.outerContainerEl.appendChild(this.containerEl);

            // Show notification when the activation key is pressed.
            document.addEventListener(Runner.events.KEYDOWN, function (e) {
                if (Runner.keycodes.JUMP[e.keyCode]) { // 윗 방향키나 스페이스 눌렀을 때 이벤트 다운을 누른다면
                    this.containerEl.classList.add(Runner.classes.SNACKBAR_SHOW);
                    document.querySelector('.icon').classList.add('icon-disabled');
                }
            }.bind(this));
        },

        /**
         * Setting individual settings for debugging. 각 개인별 세팅
         * @param {string} setting
         * @param {*} value
         */
        // 세팅 설정하기 중력, 점프 높이, 속도 등등
        updateConfigSetting: function (setting, value) {
            if (setting in this.config && value != undefined) {
                this.config[setting] = value;

                switch (setting) {
                    case 'GRAVITY':
                    case 'MIN_JUMP_HEIGHT':
                    case 'SPEED_DROP_COEFFICIENT':
                        this.tRex.config[setting] = value;
                        break;
                    case 'INITIAL_JUMP_VELOCITY':
                        this.tRex.setJumpVelocity(value);
                        break;
                    case 'SPEED':
                        this.setSpeed(value);
                        break;
                }
            }
        },

        /**
         * Cache the appropriate image sprite from the page and get the sprite sheet
         * definition.
         */
        // 이미지 불러와서 설정하는 곳
        loadImages: function () {
            if (IS_HIDPI) {
                Runner.imageSprite = document.getElementById('offline-resources-2x');
                this.spriteDef = Runner.spriteDefinition.HDPI;
            } else {
                Runner.imageSprite = document.getElementById('offline-resources-1x');
                this.spriteDef = Runner.spriteDefinition.LDPI;
            }

            if (Runner.imageSprite.complete) {
                this.init();
            } else {
                // If the images are not yet loaded, add a listener.
                Runner.imageSprite.addEventListener(Runner.events.LOAD,
                    this.init.bind(this));
            }
        },

        /**
         * Load and decode base 64 encoded sounds.
         */
        // 소리 불러오기
        loadSounds: function () {
            if (!IS_IOS) {
                this.audioContext = new AudioContext();

                var resourceTemplate =
                    document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

                for (var sound in Runner.sounds) {
                    var soundSrc =
                        resourceTemplate.getElementById(Runner.sounds[sound]).src;
                    soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
                    var buffer = decodeBase64ToArrayBuffer(soundSrc);

                    // Async, so no guarantee of order in array.
                    this.audioContext.decodeAudioData(buffer, function (index, audioData) {
                        this.soundFx[index] = audioData;
                    }.bind(this, sound));
                }
            }
        },

        /**
         * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
         * @param {number} opt_speed
         */
        // 속도 설정하는 함수
        setSpeed: function (opt_speed) {
            // setSpeed에서 설정하면 그 값을 넣고 아닐시 현재 속도
            var speed = opt_speed || this.currentSpeed;

            // Reduce the speed on smaller mobile screens.
            // 모바일 화면에서는 속도를 줄여준다.
            if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
                // 기본 폭보다 현재 화면 폭이 작다면 모바일 속도를 줄여서 설정해준다.
                var mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH *
                    this.config.MOBILE_SPEED_COEFFICIENT;
                this.currentSpeed = (mobileSpeed > speed) ? speed : mobileSpeed;
                // 모바일 속도가 더 빠르다면 speed 값을 넣고 그냥 속도가 더 빠르다면 모바일 속도를 넣는다.
            } else if (opt_speed) {// 모바일 화면 같이 작은 곳이 아닐시에는 현재 속도를 옵션 속도로 변경해준다.
                this.currentSpeed = opt_speed;
            }
        },

        /**
         * Game initialiser. 게임 초기화
         */
        init: function () {
            // Hide the static icon.
            document.querySelector('.' + Runner.classes.ICON).style.visibility =
                'hidden';

            this.adjustDimensions();// 차원 조절
            this.setSpeed(); // 속도 설정
            
            this.containerEl = document.createElement('div');
            this.containerEl.className = Runner.classes.CONTAINER;

            // Player canvas container.
            this.canvas = createCanvas(this.containerEl, this.dimensions.WIDTH,
                this.dimensions.HEIGHT, Runner.classes.PLAYER);

            this.canvasCtx = this.canvas.getContext('2d');
            this.canvasCtx.fillStyle = '#f7f7f7';
            this.canvasCtx.fill();
            Runner.updateCanvasScaling(this.canvas);

            // Horizon contains clouds, obstacles and the ground.
            this.horizon = new Horizon(this.canvas, this.spriteDef, this.dimensions,
                this.config.GAP_COEFFICIENT);

            // Distance meter
            this.distanceMeter = new DistanceMeter(this.canvas,
                this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);

            // Draw t-rex
            // 공룡 그리기
            this.tRex = new Trex(this.canvas, this.spriteDef.TREX);

            this.outerContainerEl.appendChild(this.containerEl);

            // 모바일 화면인지 아닌지 확인하기 아이폰 or 안드로이드인지
            if (IS_MOBILE) {
                this.createTouchController();
            }

            this.startListening(); // 키 인식하기
            this.update(); // ??

            // 화면 크기 줄이면 크기를 다시 설정하는 이벤트 리스너 삽입
            window.addEventListener(Runner.events.RESIZE,
                this.debounceResize.bind(this));
        },

        /**
         * Create the touch controller. A div that covers whole screen.
         */
        // 화면 터치 할 때 어떻게 되어야 할지 이거는 다루지 않으니 신경 x
        createTouchController: function () {
            this.touchController = document.createElement('div');
            this.touchController.className = Runner.classes.TOUCH_CONTROLLER;
            this.outerContainerEl.appendChild(this.touchController);
        },

        /**
         * Debounce the resize event.
         */
        // 크기 조정 이벤트
        debounceResize: function () {
            if (!this.resizeTimerId_) {
                this.resizeTimerId_ =
                    setInterval(this.adjustDimensions.bind(this), 250);
            }
        },

        /**
         * Adjust game space dimensions on resize.
         */
        // 게임 화면을 창에 맞춰서 조정하는 것임 이거는 신경 쓸 필요가 없다.
        adjustDimensions: function () {
            clearInterval(this.resizeTimerId_);
            this.resizeTimerId_ = null;

            var boxStyles = window.getComputedStyle(this.outerContainerEl);
            var padding = Number(boxStyles.paddingLeft.substr(0,
                boxStyles.paddingLeft.length - 2));

            this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;
            this.dimensions.WIDTH = Math.min(DEFAULT_WIDTH, this.dimensions.WIDTH); //Arcade Mode
            if (this.activated) {
                this.setArcadeModeContainerScale();
            }
            
            // Redraw the elements back onto the canvas.
            if (this.canvas) {
                this.canvas.width = this.dimensions.WIDTH;
                this.canvas.height = this.dimensions.HEIGHT;

                Runner.updateCanvasScaling(this.canvas);

                this.distanceMeter.calcXPos(this.dimensions.WIDTH);
                this.clearCanvas();
                this.horizon.update(0, 0, true);
                this.tRex.update(0);

                // Outer container and distance meter.
                if (this.playing || this.crashed || this.paused) {
                    this.containerEl.style.width = this.dimensions.WIDTH + 'px';
                    this.containerEl.style.height = this.dimensions.HEIGHT + 'px';
                    this.distanceMeter.update(0, Math.ceil(this.distanceRan));
                    this.stop();
                } else {
                    this.tRex.draw(0, 0);
                }

                // Game over panel.
                if (this.crashed && this.gameOverPanel) {
                    this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
                    this.gameOverPanel.draw();
                }
            }
        },

        /**
         * Play the game intro.
         * Canvas container width expands out to the full width.
         */
        // 게임 화면이 꽉 찰 수 있도록 하는 것 이거는 신경 x
        playIntro: function () {
            if (!this.activated && !this.crashed) {
                this.playingIntro = true;
                this.tRex.playingIntro = true;

                // CSS animation definition.
                var keyframes = '@-webkit-keyframes intro { ' +
                    'from { width:' + Trex.config.WIDTH + 'px }' +
                    'to { width: ' + this.dimensions.WIDTH + 'px }' +
                    '}';
                
                // create a style sheet to put the keyframe rule in 
                // and then place the style sheet in the html head    
                var sheet = document.createElement('style');
                sheet.innerHTML = keyframes;
                document.head.appendChild(sheet);

                this.containerEl.addEventListener(Runner.events.ANIM_END,
                    this.startGame.bind(this));

                this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';
                this.containerEl.style.width = this.dimensions.WIDTH + 'px';

                this.playing = true;
                this.activated = true;
            } else if (this.crashed) {
                this.restart();
            }
        },


        /**
         * Update the game status to started.
         */
        // 게임 시작시
        startGame: function () {
            this.setArcadeMode();

            this.runningTime = 0;
            // 시작 시간 0으로 초기화
            this.playingIntro = false;
            this.tRex.playingIntro = false;
            this.containerEl.style.webkitAnimation = '';
            this.playCount++;// 게임 횟수 늘리기

            // Handle tabbing off the page. Pause the current game.
            document.addEventListener(Runner.events.VISIBILITY,
                this.onVisibilityChange.bind(this));

            window.addEventListener(Runner.events.BLUR,
                this.onVisibilityChange.bind(this));

            window.addEventListener(Runner.events.FOCUS,
                this.onVisibilityChange.bind(this));
        },

        // 컨버스 지우기
        clearCanvas: function () {
            this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
                this.dimensions.HEIGHT);
        },

        /**
         * Update the game frame and schedules the next one.
         */
        // 게임 업데이트
        update: function () {
            this.updatePending = false;

            // 지금 시간을 얻어서 now 변수 저장
            var now = getTimeStamp();
            var deltaTime = now - (this.time || now);
            this.time = now;

            // 만약 게임 중이라면
            if (this.playing) {
                this.clearCanvas();
                // 컨버스를 전부 지움
                const btn = document.getElementById('btn-modal');
                btn.style.display = 'none';

                const toggle = document.getElementById('custom_input');
                hard = toggle.checked
                toggle.disabled = true;
                
                // tRex가 점프시 updateJump 함수 서용
                if (this.tRex.jumping) {
                    this.tRex.updateJump(deltaTime);
                    // 점프하는 함수 사용
                }
                if(this.tRex.attacking){ // 공격 중일 때
                    this.tRex.updateattack(deltaTime);
                }

                // 달린 시간에다가 델타 타임들을 더해준다.
                this.runningTime += deltaTime;
                // 러닝 타임이 클리어 시간(3000) 보다 많으면 hasObstacles를 true로 변경
                var hasObstacles = this.runningTime > this.config.CLEAR_TIME;

                // 첫번째 점프 카운트가 1이면 게임이 시작됨
                // First jump triggers the intro.
                if (this.tRex.jumpCount == 1 && !this.playingIntro) {
                    this.playIntro();// 게임 화면이 꽉 차도록 설정해주는 것
                }

                // The horizon doesn't move until the intro is over.
                if (this.playingIntro) {
                    this.horizon.update(0, this.currentSpeed, hasObstacles);
                } else {
                    deltaTime = !this.activated ? 0 : deltaTime;
                    this.horizon.update(deltaTime, this.currentSpeed, hasObstacles,
                        this.inverted);
                }

                // Check for collisions.
                // 충돌시 어떻게 해야하는지에 대해서
                var collision = hasObstacles && 
                    checkForCollision(this.horizon.obstacles[0], this.tRex);
                // 수정
                if (!collision) {
                    this.distanceRan += (this.currentSpeed * deltaTime / this.msPerFrame);
                    if(flag){
                        if(!hard) {
                            console.log(this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan)));
                            this.distanceRan += 875;
                            console.log(this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan)));
                        }
                        else {
                            console.log(this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan)));
                            this.distanceRan += 40000;
                            console.log(this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan)));
                        }
                        flag = false;
                    }
                    if (this.currentSpeed < this.config.MAX_SPEED) {
                        this.currentSpeed += this.config.ACCELERATION;
                        if(hard) this.currentSpeed += 0.01;
                    }
                    // 부스터 기능 구현
                    if(booster){
                        if(beforeSpeed == 0){
                            beforeSpeed = this.currentSpeed;
                            this.currentSpeed += 7;
                        } 
                        Attackcount -= 1; // 공격하는 횟수
                        if(Attackcount < 10){
                            booster = false;
                            Attackcount = 1;
                            this.currentSpeed = beforeSpeed;
                            beforeSpeed = 0;
                        }
                    }
                } else {
                    this.gameOver();
                }

                var playAchievementSound = this.distanceMeter.update(deltaTime,
                    Math.ceil(this.distanceRan));

                if (playAchievementSound) {
                    this.playSound(this.soundFx.SCORE);
                }

                // Night mode.
                if (this.invertTimer > this.config.INVERT_FADE_DURATION) {
                    this.invertTimer = 0;
                    this.invertTrigger = false;
                    this.invert();
                } else if (this.invertTimer) {
                    this.invertTimer += deltaTime;
                } else {
                    var actualDistance =
                        this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan));

                    if (actualDistance > 0) {
                        this.invertTrigger = !(actualDistance %
                            this.config.INVERT_DISTANCE);

                        if (this.invertTrigger && this.invertTimer === 0) {
                            this.invertTimer += deltaTime;
                            this.invert();
                        }
                    }
                }
            }

            if (this.playing || (!this.activated &&
                this.tRex.blinkCount < Runner.config.MAX_BLINK_COUNT)) {
                this.tRex.update(deltaTime);
                this.scheduleNextUpdate();
            }
        },

        /**
         * Event handler.
         */
        handleEvent: function (e) {
            return (function (evtType, events) {
                switch (evtType) {
                    case events.KEYDOWN:
                    case events.TOUCHSTART:
                    case events.MOUSEDOWN:
                        this.onKeyDown(e);
                        break;
                    case events.KEYUP:
                    case events.TOUCHEND:
                    case events.MOUSEUP:
                        this.onKeyUp(e);
                        break;
                }
            }.bind(this))(e.type, Runner.events);
        },

        /**
         * Bind relevant key / mouse / touch listeners.
         */
        startListening: function () {
            // Keys.
            // 키보드 위키 아래키 확인
            document.addEventListener(Runner.events.KEYDOWN, this);
            document.addEventListener(Runner.events.KEYUP, this);

            // 모바일에서는 무조건 터치만 가능
            if (IS_MOBILE) {
                // Mobile only touch devices.
                this.touchController.addEventListener(Runner.events.TOUCHSTART, this);
                this.touchController.addEventListener(Runner.events.TOUCHEND, this);
                this.containerEl.addEventListener(Runner.events.TOUCHSTART, this);
            } else {
                // Mouse. 마우스로 터치하는지 안하는지도 확인함
                document.addEventListener(Runner.events.MOUSEDOWN, this);
                document.addEventListener(Runner.events.MOUSEUP, this);
            }
        },

        /**
         * Remove all listeners.
         */
        stopListening: function () {
            document.removeEventListener(Runner.events.KEYDOWN, this);
            document.removeEventListener(Runner.events.KEYUP, this);

            if (IS_MOBILE) {
                this.touchController.removeEventListener(Runner.events.TOUCHSTART, this);
                this.touchController.removeEventListener(Runner.events.TOUCHEND, this);
                this.containerEl.removeEventListener(Runner.events.TOUCHSTART, this);
            } else {
                document.removeEventListener(Runner.events.MOUSEDOWN, this);
                document.removeEventListener(Runner.events.MOUSEUP, this);
            }
        },

        /**
         * Process keydown.
         * @param {Event} e
         */
        onKeyDown: function (e) {
            // Prevent native page scrolling whilst tapping on mobile.
            if (IS_MOBILE && this.playing) {
                e.preventDefault();
            }

            if (e.target != this.detailsButton) {
                if (!this.crashed && (Runner.keycodes.JUMP[e.keyCode] ||
                    e.type == Runner.events.TOUCHSTART)) {
                    if (!this.playing) {
                        this.loadSounds();
                        this.playing = true;
                        this.update();
                        if (window.errorPageController) {
                            errorPageController.trackEasterEgg();
                        }
                    }
                    //  Play sound effect and jump on starting the game for the first time.
                    if (!this.tRex.jumping && !this.tRex.ducking && !this.tRex.attacking) {
                        this.playSound(this.soundFx.BUTTON_PRESS);
                        this.tRex.startJump(this.currentSpeed);
                    }
                }

                if(!this.crashed && (Runner.keycodes.ATTACK[e.keyCode])&&this.playing){
                    if(!this.tRex.attacking && !this.tRex.ducking && !this.tRex.jumping && !booster){
                        this.tRex.startattack(this.currentSpeed); // 공격을 시작하는 기준
                    }
                }

                if (this.crashed && e.type == Runner.events.TOUCHSTART &&
                    e.currentTarget == this.containerEl) {
                    this.restart();
                }

            }

            // 게임을 진행중이고 누르는 키를 눌렀을 때 점프 중이라면 속도를 낮춰준다.
            if (this.playing && !this.crashed && Runner.keycodes.DUCK[e.keyCode]) {
                e.preventDefault();
                if (this.tRex.jumping) {
                    // 속도 감소, 점프 키를 누르지 않은 경우에만 활성화됩니다.
                    this.tRex.setSpeedDrop();
                } else if (!this.tRex.jumping && !this.tRex.ducking) { // 공룡이 점프중이지 않고 숙이지도 않으면
                    // Duck.
                    this.tRex.setDuck(true);
                }
            }
        },


        /**
         * Process key up.
         * @param {Event} e
         */
        onKeyUp: function (e) {
            var keyCode = String(e.keyCode);
            var isjumpKey = Runner.keycodes.JUMP[keyCode] ||
                e.type == Runner.events.TOUCHEND ||
                e.type == Runner.events.MOUSEDOWN;

            var attack = Runner.keycodes.ATTACK[keyCode]; // 공격 키 값
            
            if (this.isRunning() && isjumpKey) {
                this.tRex.endJump();
            }else if(attack){//수정중
                this.tRex.endattack();
            }
            else if (Runner.keycodes.DUCK[keyCode]) { 
                this.tRex.speedDrop = false;
                this.tRex.setDuck(false);
                
            } else if (this.crashed) {
                // Check that enough time has elapsed before allowing jump key to restart.
                var deltaTime = getTimeStamp() - this.time;

                if (Runner.keycodes.RESTART[keyCode] || this.isLeftClickOnCanvas(e) ||
                    (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
                        Runner.keycodes.JUMP[keyCode])) {
                    this.restart();
                }
            } else if (this.paused && isjumpKey) {
                // Reset the jump state
                this.tRex.reset();
                this.play();
            }
        },

        /**
         * Returns whether the event was a left click on canvas.
         * On Windows right click is registered as a click.
         * @param {Event} e
         * @return {boolean}
         */
        isLeftClickOnCanvas: function (e) {
            return e.button != null && e.button < 2 &&
                e.type == Runner.events.MOUSEUP && e.target == this.canvas;
        },

        /**
         * RequestAnimationFrame wrapper.
         */
        scheduleNextUpdate: function () {
            if (!this.updatePending) {
                this.updatePending = true;
                this.raqId = requestAnimationFrame(this.update.bind(this));
            }
        },

        /**
         * Whether the game is running.
         * @return {boolean}
         */
        isRunning: function () {
            return !!this.raqId;
        },

        /**
         * Game over state.
         */
        gameOver: function () {
            this.playSound(this.soundFx.HIT);
            vibrate(200);

            this.stop();
            this.crashed = true;
            this.distanceMeter.acheivement = false;

            this.tRex.update(100, Trex.status.CRASHED);

            // Game over panel.
            if (!this.gameOverPanel) {
                this.gameOverPanel = new GameOverPanel(this.canvas,
                    this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
                    this.dimensions);
            } else {
                this.gameOverPanel.draw();
            }

            // Update the high score.
            if (this.distanceRan > this.highestScore) {
                this.highestScore = Math.ceil(this.distanceRan);
                this.distanceMeter.setHighScore(this.highestScore);
            }

            // Reset the time clock.
            this.time = getTimeStamp();
        },

        stop: function () {
            this.playing = false;
            if(!this.playing){
                const btn = document.getElementById('btn-modal');
                btn.style.display = 'inline-block';

                const toggle = document.getElementById('custom_input');
                toggle.disabled = false;
            }
            this.paused = true;
            cancelAnimationFrame(this.raqId);
            this.raqId = 0;
        },

        play: function () {
            if (!this.crashed) {
                this.playing = true;
                this.paused = false;
                this.tRex.update(0, Trex.status.RUNNING);
                this.time = getTimeStamp();
                this.update();
            }
        },

        restart: function () {
            if (!this.raqId) {
                this.playCount++;
                this.runningTime = 0;
                this.playing = true;
                this.crashed = false;
                this.distanceRan = 0;
                this.setSpeed(this.config.SPEED);
                this.time = getTimeStamp();
                this.containerEl.classList.remove(Runner.classes.CRASHED);
                this.clearCanvas();
                this.distanceMeter.reset(this.highestScore);
                this.horizon.reset();
                this.tRex.reset();
                this.playSound(this.soundFx.BUTTON_PRESS);
                this.invert(true);
                this.update();
                Attackcount = 1; // 공격 횟수 초기화
            }
        },
        
        /**
         * Hides offline messaging for a fullscreen game only experience.
         */
        setArcadeMode() {
            document.body.classList.add(Runner.classes.ARCADE_MODE);
            this.setArcadeModeContainerScale();
        },

        /**
         * Sets the scaling for arcade mode.
         */
        setArcadeModeContainerScale() {
            const windowHeight = window.innerHeight;
            const scaleHeight = windowHeight / this.dimensions.HEIGHT;
            const scaleWidth = window.innerWidth / this.dimensions.WIDTH;
            const scale = Math.max(1, Math.min(scaleHeight, scaleWidth));
            const scaledCanvasHeight = this.dimensions.HEIGHT * scale;
            // Positions the game container at 10% of the available vertical window
            // height minus the game container height.
            const translateY = Math.ceil(Math.max(0, (windowHeight - scaledCanvasHeight -
                                                      Runner.config.ARCADE_MODE_INITIAL_TOP_POSITION) *
                                                  Runner.config.ARCADE_MODE_TOP_POSITION_PERCENT)) *
                  window.devicePixelRatio;

            const cssScale = scale;
            this.containerEl.style.transform =
                'scale(' + cssScale + ') translateY(' + translateY + 'px)';
        },
        
        /**
         * Pause the game if the tab is not in focus.
         */
        onVisibilityChange: function (e) {
            if (document.hidden || document.webkitHidden || e.type == 'blur' ||
                document.visibilityState != 'visible') {
                this.stop();
            } else if (!this.crashed) {
                this.tRex.reset();
                this.play();
            }
        },

        /**
         * Play a sound.
         * @param {SoundBuffer} soundBuffer
         */
        playSound: function (soundBuffer) {
            if (soundBuffer) {
                var sourceNode = this.audioContext.createBufferSource();
                sourceNode.buffer = soundBuffer;
                sourceNode.connect(this.audioContext.destination);
                sourceNode.start(0);
            }
        },

        /**
         * Inverts the current page / canvas colors.
         * @param {boolean} Whether to reset colors.
         */
        invert: function (reset) {
            if (reset) {
                document.body.classList.toggle(Runner.classes.INVERTED, false);
                this.invertTimer = 0;
                this.inverted = false;
            } else {
                this.inverted = document.body.classList.toggle(Runner.classes.INVERTED,
                    this.invertTrigger);
            }
        }
    };


    /**
     * Updates the canvas size taking into
     * account the backing store pixel ratio and
     * the device pixel ratio.
     *
     * See article by Paul Lewis:
     * http://www.html5rocks.com/en/tutorials/canvas/hidpi/
     *
     * @param {HTMLCanvasElement} canvas
     * @param {number} opt_width
     * @param {number} opt_height
     * @return {boolean} Whether the canvas was scaled.
     */
    Runner.updateCanvasScaling = function (canvas, opt_width, opt_height) {
        var context = canvas.getContext('2d');

        // Query the various pixel ratios
        var devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
        var backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
        var ratio = devicePixelRatio / backingStoreRatio;

        // Upscale the canvas if the two ratios don't match
        if (devicePixelRatio !== backingStoreRatio) {
            var oldWidth = opt_width || canvas.width;
            var oldHeight = opt_height || canvas.height;

            canvas.width = oldWidth * ratio;
            canvas.height = oldHeight * ratio;

            canvas.style.width = oldWidth + 'px';
            canvas.style.height = oldHeight + 'px';

            // Scale the context to counter the fact that we've manually scaled
            // our canvas element.
            context.scale(ratio, ratio);
            return true;
        } else if (devicePixelRatio == 1) {
            // Reset the canvas width / height. Fixes scaling bug when the page is
            // zoomed and the devicePixelRatio changes accordingly.
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
        }
        return false;
    };


    /**
     * Get random number.
     * @param {number} min
     * @param {number} max
     * @param {number}
     */
    function getRandomNum(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }


    /**
     * Vibrate on mobile devices.
     * @param {number} duration Duration of the vibration in milliseconds.
     */
    function vibrate(duration) {
        if (IS_MOBILE && window.navigator.vibrate) {
            window.navigator.vibrate(duration);
        }
    }


    /**
     * Create canvas element.
     * @param {HTMLElement} container Element to append canvas to.
     * @param {number} width
     * @param {number} height
     * @param {string} opt_classname
     * @return {HTMLCanvasElement}
     */
    function createCanvas(container, width, height, opt_classname) {
        var canvas = document.createElement('canvas');
        canvas.className = opt_classname ? Runner.classes.CANVAS + ' ' +
            opt_classname : Runner.classes.CANVAS;
        canvas.width = width;
        canvas.height = height;
        container.appendChild(canvas);

        return canvas;
    }


    /**
     * Decodes the base 64 audio to ArrayBuffer used by Web Audio.
     * @param {string} base64String
     */
    function decodeBase64ToArrayBuffer(base64String) {
        var len = (base64String.length / 4) * 3;
        var str = atob(base64String);
        var arrayBuffer = new ArrayBuffer(len);
        var bytes = new Uint8Array(arrayBuffer);

        for (var i = 0; i < len; i++) {
            bytes[i] = str.charCodeAt(i);
        }
        return bytes.buffer;
    }


    /**
     * Return the current timestamp.
     * @return {number}
     */
    function getTimeStamp() {
        return IS_IOS ? new Date().getTime() : performance.now();
    }


    //******************************************************************************


    /**
     * Game over panel.
     * @param {!HTMLCanvasElement} canvas
     * @param {Object} textImgPos
     * @param {Object} restartImgPos
     * @param {!Object} dimensions Canvas dimensions.
     * @constructor
     */
    function GameOverPanel(canvas, textImgPos, restartImgPos, dimensions) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.canvasDimensions = dimensions;
        this.textImgPos = textImgPos;
        this.restartImgPos = restartImgPos;
        this.draw();
    };


    /**
     * Dimensions used in the panel.
     * @enum {number}
     */
    GameOverPanel.dimensions = {
        TEXT_X: 0,
        TEXT_Y: 13,
        TEXT_WIDTH: 191,
        TEXT_HEIGHT: 11,
        RESTART_WIDTH: 36,
        RESTART_HEIGHT: 32
    };


    GameOverPanel.prototype = {
        /**
         * Update the panel dimensions.
         * @param {number} width New canvas width.
         * @param {number} opt_height Optional new canvas height.
         */
        updateDimensions: function (width, opt_height) {
            this.canvasDimensions.WIDTH = width;
            if (opt_height) {
                this.canvasDimensions.HEIGHT = opt_height;
            }
        },

        /**
         * Draw the panel.
         */
        draw: function () {
            var dimensions = GameOverPanel.dimensions;

            var centerX = this.canvasDimensions.WIDTH / 2;

            // Game over text.
            var textSourceX = dimensions.TEXT_X;
            var textSourceY = dimensions.TEXT_Y;
            var textSourceWidth = dimensions.TEXT_WIDTH;
            var textSourceHeight = dimensions.TEXT_HEIGHT;

            var textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
            var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
            var textTargetWidth = dimensions.TEXT_WIDTH;
            var textTargetHeight = dimensions.TEXT_HEIGHT;

            var restartSourceWidth = dimensions.RESTART_WIDTH;
            var restartSourceHeight = dimensions.RESTART_HEIGHT;
            var restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2);
            var restartTargetY = this.canvasDimensions.HEIGHT / 2;

            if (IS_HIDPI) {
                textSourceY *= 2;
                textSourceX *= 2;
                textSourceWidth *= 2;
                textSourceHeight *= 2;
                restartSourceWidth *= 2;
                restartSourceHeight *= 2;
            }

            textSourceX += this.textImgPos.x;
            textSourceY += this.textImgPos.y;

            // Game over text from sprite.
            this.canvasCtx.drawImage(Runner.imageSprite,
                textSourceX, textSourceY, textSourceWidth, textSourceHeight,
                textTargetX, textTargetY, textTargetWidth, textTargetHeight);

            // Restart button.
            this.canvasCtx.drawImage(Runner.imageSprite,
                this.restartImgPos.x, this.restartImgPos.y,
                restartSourceWidth, restartSourceHeight,
                restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
                dimensions.RESTART_HEIGHT);
        }
    };


    //******************************************************************************

    /**
     * Check for a collision.
     * @param {!Obstacle} obstacle
     * @param {!Trex} tRex T-rex object.
     * @param {HTMLCanvasContext} opt_canvasCtx Optional canvas context for drawing
     *    collision boxes.
     * @return {Array<CollisionBox>}
     */
    function checkForCollision(obstacle, tRex, opt_canvasCtx) {
        // 변수는 장애물, 공룡, canvas 옵션
        var obstacleBoxXPos = Runner.defaultDimensions.WIDTH + obstacle.xPos;
        
        // Adjustments are made to the bounding box as there is a 1 pixel white
        // border around the t-rex and obstacles.
        var tRexBox = new CollisionBox( // 공룡 범위
            tRex.xPos + 1,
            tRex.yPos + 1,
            tRex.config.WIDTH - 2,
            tRex.config.HEIGHT - 2);

        var obstacleBox = new CollisionBox( // 장애물 범위
            obstacle.xPos + 1,
            obstacle.yPos + 1,
            obstacle.typeConfig.width * obstacle.size - 2,
            obstacle.typeConfig.height - 2);
       
        // Debug outer box
        if (opt_canvasCtx) {
            drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
            // drawCollisionBoxes 역할은 다시 알아봐야함
        }
        // 장애물 공격시 익룡: 점수 50점 획득
        // 선인장: 5개 섭취시 속도가 빨라짐
        if(booster&&!hard){
            if (boxCompare(tRexBox, obstacleBox)){
                obstacle.remove = true; 
                if(!flag) flag = true;
            }
            return false;
        }
        if (boxCompare(tRexBox, obstacleBox)&&tRex.attacking) { // 공룡의 박스와 장애물 박스 비교
            
            // 하드모드에서 익룡 먹을 시 100점 추가 
            // 모든 모드에서 선인장 섭취시 공격시간 증가
            if(obstacle.typeConfig.type == 'PTERODACTYL' && hard){
                if(!flag){
                    flag = true;
                }
            }else{ 
                Attackcount += 100;
                if(Attackcount > 500){
                    booster = true;
                }
        }
            obstacle.remove = true; 
            return false;
        }
        // Simple outer bounds check.
        if (boxCompare(tRexBox, obstacleBox)) { // 공룡의 박스와 장애물 박스 비교
            var collisionBoxes = obstacle.collisionBoxes; //  장애물의 충돌 범위
            var tRexCollisionBoxes = tRex.ducking||tRex.attacking ? // 공룡의 충돌 범위
                Trex.collisionBoxes.DUCKING : Trex.collisionBoxes.RUNNING;

            // Detailed axis aligned box check.
            for (var t = 0; t < tRexCollisionBoxes.length; t++) {
                for (var i = 0; i < collisionBoxes.length; i++) {
                    // Adjust the box to actual positions.
                    var adjTrexBox =
                        createAdjustedCollisionBox(tRexCollisionBoxes[t], tRexBox);
                    var adjObstacleBox =
                        createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
                    var crashed = boxCompare(adjTrexBox, adjObstacleBox);
                    // 부딪혔는지 확인하기

                    // Draw boxes for debug.
                    if (opt_canvasCtx) {
                        drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
                    }

                    if (crashed) {
                        return [adjTrexBox, adjObstacleBox];
                    }
                }
            }
        }
        return false;
    };

    /**
     * Adjust the collision box.
     * @param {!CollisionBox} box The original box.
     * @param {!CollisionBox} adjustment Adjustment box.
     * @return {CollisionBox} The adjusted collision box object.
     */
    function createAdjustedCollisionBox(box, adjustment) {
        return new CollisionBox(
            box.x + adjustment.x,
            box.y + adjustment.y,
            box.width,
            box.height);
    };


    /**
     * Draw the collision boxes for debug.
     */
    function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox) {
        canvasCtx.save();
        canvasCtx.strokeStyle = '#f00';
        canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);

        canvasCtx.strokeStyle = '#0f0';
        canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y,
            obstacleBox.width, obstacleBox.height);
        canvasCtx.restore();
    };


    /**
     * Compare two collision boxes for a collision.
     * @param {CollisionBox} tRexBox
     * @param {CollisionBox} obstacleBox
     * @return {boolean} Whether the boxes intersected.
     */
    // 공룡과 장애물의 범위가 충돌하였는지 아닌지를 인식함
    function boxCompare(tRexBox, obstacleBox) {
        var crashed = false; // 충돌인지 확인하는 변수
        var tRexBoxX = tRexBox.x; // 공룡의 x축
        var tRexBoxY = tRexBox.y; // 공룡의 y축

        var obstacleBoxX = obstacleBox.x; // 장애물의 x축
        var obstacleBoxY = obstacleBox.y; // 장애물의 y축

        // Axis-Aligned Bounding Box method.
        if (tRexBox.x < obstacleBoxX + obstacleBox.width && // 공룡의 현재 x축이 장애물의 x축과 폭을 더 한 값보다 작고
            tRexBox.x + tRexBox.width > obstacleBoxX && // 공룡의 현재 x축과 폭을 더한 값이 장애물의 x축 보다 크고
            tRexBox.y < obstacleBox.y + obstacleBox.height && //  공룡의 현재 y축 값이 장애물의 y값과 더한값보다 작고
            tRexBox.height + tRexBox.y > obstacleBox.y) { // 공룡의 높이박스와 y축을 더한값이 장애물의 y값보다 크면 
            crashed = true; // 충돌한 것으로 인식
        }

        return crashed;
    };


    //******************************************************************************

    /**
     * Collision box object.
     * @param {number} x X position.
     * @param {number} y Y Position.
     * @param {number} w Width.
     * @param {number} h Height.
     */
    // 객체의 x값에 매게변수 값 삽입
    function CollisionBox(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    };


    //******************************************************************************

    /**
     * Obstacle.
     * @param {HTMLCanvasCtx} canvasCtx
     * @param {Obstacle.type} type
     * @param {Object} spritePos Obstacle position in sprite.
     * @param {Object} dimensions
     * @param {number} gapCoefficient Mutipler in determining the gap.
     * @param {number} speed
     * @param {number} opt_xOffset
     */
    // 장애물(Obstacle) 객체 생성
    // 지역 변수에 들어온 매개변수를 넣어준다.
    function Obstacle(canvasCtx, type, spriteImgPos, dimensions,
        gapCoefficient, speed, opt_xOffset) {

        this.canvasCtx = canvasCtx;
        this.spritePos = spriteImgPos;
        this.typeConfig = type;
        this.gapCoefficient = gapCoefficient;
        this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);
        this.dimensions = dimensions;
        
        //제거
        this.remove = false;

        //x축
        this.xPos = dimensions.WIDTH + (opt_xOffset || 0);
        //y축
        this.yPos = 0;
        //넓이
        this.width = 0;
        this.collisionBoxes = [];
        //차이
        this.gap = 0;
        //속도 오프셋
        this.speedOffset = 0;

        // For animated obstacles.
        this.currentFrame = 0;
        this.timer = 0;

        // 주어진 값으로 속도 초기화
        this.init(speed);
    };

    /**
     * Coefficient for calculating the maximum gap.
     * @const
     */
    Obstacle.MAX_GAP_COEFFICIENT = 1.5;

    /**
     * Maximum obstacle grouping count.
     * @const
     */
    Obstacle.MAX_OBSTACLE_LENGTH = 3,


    // 장애물과 관련된 함수를 모아준다.
    // 초기화, 크기 ,프레임 업데이트, 사이즈 계산 등
        Obstacle.prototype = {
            /**
             * Initialise the DOM for the obstacle.
             * @param {number} speed
             */
            //초기화 함수
            init: function (speed) {
                // 충돌상자 복제
                this.cloneCollisionBoxes();
                
                // 속도가 적절한 경우에만 크기 조정을 허용함
                if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
                    this.size = 1;
                }

                // 복제하는 객체의 폭 = 타입 폭 * 사이즈 크기
                this.width = this.typeConfig.width * this.size;

                // Check if obstacle can be positioned at various heights.
                // 다양한 높이에서 장애물을 배치할 수 있는지 확인
                if (Array.isArray(this.typeConfig.yPos)) {
                    // 모바일인지 아닌지 확인함 모바일이면 모바일의 y축
                    // 모바일이 아니라면 일반 y축
                    var yPosConfig = IS_MOBILE ? this.typeConfig.yPosMobile :
                        this.typeConfig.yPos;
                    // 현재 장애물의 y위치는  방금 입력한 값에서 랜덤으로 삽입함
                    this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
                    
                } else {
                    this.yPos = this.typeConfig.yPos;
                }// 그게 아니면 그냥 바로 값 넣기

                this.draw(); // 그려주기

                // Make collision box adjustments,(충돌 박스 조정해서 만들기)
                // Central box is adjusted to the size as one box. 
                //      ____        ______        ________
                //    _|   |-|    _|     |-|    _|       |-|
                //   | |<->| |   | |<--->| |   | |<----->| |
                //   | | 1 | |   | |  2  | |   | |   3   | |
                //   |_|___|_|   |_|_____|_|   |_|_______|_|
                //
                if (this.size > 1) {// 사이즈가 1보다 크다면
                    this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
                        this.collisionBoxes[2].width;
                    this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
                }

                // 수평선에서 다른 속도로 이동하는 장애물의 경우. (ex. 선인장)
                if (this.typeConfig.speedOffset) {
                    this.speedOffset = Math.random() > 0.5 ? this.typeConfig.speedOffset :
                        -this.typeConfig.speedOffset;
                }

                this.gap = this.getGap(this.gapCoefficient, speed);
            },

            /**
             * Draw and crop based on size. 
             */
            //장애물의 크기에 따라 그리고 자릅니다.
            draw: function () {
                var sourceWidth = this.typeConfig.width;
                var sourceHeight = this.typeConfig.height;
                // 기본 폭과 높이를 받아옴

                if (IS_HIDPI) {
                    sourceWidth = sourceWidth * 2;
                    sourceHeight = sourceHeight * 2;
                }

                // X position in sprite.
                // X 축의 스프라이트
                var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1)) +
                    this.spritePos.x;
                
                // Animation frames.
                if (this.currentFrame > 0) {//현재 프레임이 0보다 크다면
                    sourceX += sourceWidth * this.currentFrame;
                    // X축에다가 기본 폭의 현재 프레임을 곱하여 더해줌
                }
                
                // 이미지를 그려줌. 이게 좀 중요
                // 매개 변수로 달리는 캐릭터의 이미지 스프라이트, X축, Y축 위치, 등을 넣어준다.
                this.canvasCtx.drawImage(Runner.imageSprite,
                    sourceX, this.spritePos.y,
                    sourceWidth * this.size, sourceHeight,
                    this.xPos, this.yPos,
                    this.typeConfig.width * this.size, this.typeConfig.height);
            },

            /**
             * Obstacle frame update.
             * @param {number} deltaTime
             * @param {number} speed
             */
            // 장애물의 프레임 업데이트하는 함수
            update: function (deltaTime, speed) {
                if (!this.remove) {
                    if (this.typeConfig.speedOffset) {// 스피드 옵뎃만큼 더해준다.
                        speed += this.speedOffset;
                    }
                    this.xPos -= Math.floor((speed * FPS / 1000) * deltaTime);
                    // x축의 위치를 빼준다. (장애물을 왼쪽으로 옮겨준다는 뜻임)

                    // Update frame 프레임 업데이트
                    if (this.typeConfig.numFrames) {
                        this.timer += deltaTime; // 현재 타이머의 델타 시간을 더해준다.
                        if (this.timer >= this.typeConfig.frameRate) {
                            this.currentFrame = 
                            // 만약 현재 프레임의 위치가 기준 프레임보다 1 작다면 현재 프레임을 0으로 바꾸어준다. 그렇지 않을 시 현재 프레임에 1을 더해줌
                                this.currentFrame == this.typeConfig.numFrames - 1 ?
                                    0 : this.currentFrame + 1;
                            this.timer = 0;
                        }
                    }
                    this.draw(); // 다시 그려준다.

                    // 그려주는데 만약에 X축밖에 나간다면
                    if (!this.isVisible()) {
                        this.remove = true;
                    }
                }
            },

            /**
             * Calculate a random gap size.
             * - Minimum gap gets wider as speed increses
             * @param {number} gapCoefficient
             * @param {number} speed
             * @return {number} The gap size.
             */
            // 랜덤으로 나오는 차이의 사이즈를 계산해줌
            getGap: function (gapCoefficient, speed) {
                var minGap = Math.round(this.width * speed +
                    this.typeConfig.minGap * gapCoefficient);
                var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
                return getRandomNum(minGap, maxGap); // 차이를 구해서 return
            },

            /**
             * Check if obstacle is visible.
             * @return {boolean} Whether the obstacle is in the game area.
             */
            // 장애물이 보이는지 안보이는지 확인하는 것
            // 즉, 장애물이 게임 공간안에 있는지 없는지를 확인한다.
            isVisible: function () {
                // x축과 폭을 더했을 때 0보다 크다면 true 
                // why? 아직 화면안에 존재한다는 뜻이니까 
                // 그런데 0이하면 화면 밖에 있을테니까 없애야겠지?
                return this.xPos + this.width > 0;
            },

            /**
             * Make a copy of the collision boxes, since these will change based on
             * obstacle type and size.
             */
            // 장애물 유형과 크기때문에 변경 될 수 있어서 충돌 상자를 복사해야한다.
            // 충돌 상자 복제 함수
            cloneCollisionBoxes: function () {
                var collisionBoxes = this.typeConfig.collisionBoxes;
                
                // 충돌 상자 배열의 끝부터 0까지 내려가면서 확인
                for (var i = collisionBoxes.length - 1; i >= 0; i--) {
                    // 배열을 위에서부터 새로 복사해서 넣어준다.
                    this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
                        collisionBoxes[i].y, collisionBoxes[i].width,
                        collisionBoxes[i].height);
                }
            }
        };

    /**
     * Obstacle definitions.
     * minGap: minimum pixel space betweeen obstacles.
     * multipleSpeed: Speed at which multiples are allowed.
     * speedOffset: speed faster / slower than the horizon.
     * minSpeed: Minimum speed which the obstacle can make an appearance.
     */
    // 장애물 정의하는 곳 여기 중요
    // minGap: 장애물 사이의 최소 픽셀 공간.
    // multipleSpeed: 늘리는게 허용되는 속도.
    // speedOffset: 수평선보다 빠르거나 느린 속도.
    // minSpeed: 장애물이 나타날 수 있는 최소 속도.
    // 여기에다가 장애물 넣을 것을 삽입 해주어야 한다.
    Obstacle.types = [
        {   //작은 선인장
            type: 'CACTUS_SMALL',
            width: 17,
            height: 35,
            yPos: 105,
            multipleSpeed: 4,
            minGap: 120,
            minSpeed: 0,
            collisionBoxes: [ // 충돌 박스 유형
                new CollisionBox(0, 7, 5, 27),
                new CollisionBox(4, 0, 6, 34),
                new CollisionBox(10, 4, 7, 14)
            ]
        },
        {   // 큰 선인장
            type: 'CACTUS_LARGE',
            width: 25,
            height: 50,
            yPos: 90,
            multipleSpeed: 7, // 속도가 조금 더 빠름
            minGap: 120,
            minSpeed: 0,
            collisionBoxes: [
                new CollisionBox(0, 12, 7, 38),
                new CollisionBox(8, 0, 7, 49),
                new CollisionBox(13, 10, 10, 38)
            ]
        },
        {   //익룡
            type: 'PTERODACTYL',
            width: 46,
            height: 40,
            yPos: [100], // Variable height. // 위치는 계속 변경 됨
            yPosMobile: [100, 50], // Variable height mobile. // 핸드폰의 Y축
            multipleSpeed: 999,
            minSpeed: 8.5,
            minGap: 150,
            collisionBoxes: [
                new CollisionBox(15, 15, 16, 5),
                new CollisionBox(18, 21, 24, 6),
                new CollisionBox(2, 14, 4, 3),
                new CollisionBox(6, 10, 4, 7),
                new CollisionBox(10, 8, 6, 9)
            ],
            numFrames: 2,
            frameRate: 1000 / 6,
            speedOffset: .8
        },
        {   //익룡
            type: 'PTERODACTYL',
            width: 46,
            height: 40,
            yPos: [100, 75, 50, 100, 100], // Variable height. // 위치는 계속 변경 됨
            yPosMobile: [100, 50], // Variable height mobile. // 핸드폰의 Y축
            multipleSpeed: 999,
            minSpeed: 8.5,
            minGap: 150,
            collisionBoxes: [
                new CollisionBox(15, 15, 16, 5),
                new CollisionBox(18, 21, 24, 6),
                new CollisionBox(2, 14, 4, 3),
                new CollisionBox(6, 10, 4, 7),
                new CollisionBox(10, 8, 6, 9)
            ],
            numFrames: 2,
            frameRate: 1000 / 6,
            speedOffset: .8
        },
        {   //익룡
            type: 'PTERODACTYL',
            width: 46,
            height: 40,
            yPos: [100], // Variable height. // 위치는 계속 변경 됨
            yPosMobile: [100, 50], // Variable height mobile. // 핸드폰의 Y축
            multipleSpeed: 999,
            minSpeed: 8.5,
            minGap: 150,
            collisionBoxes: [
                new CollisionBox(15, 15, 16, 5),
                new CollisionBox(18, 21, 24, 6),
                new CollisionBox(2, 14, 4, 3),
                new CollisionBox(6, 10, 4, 7),
                new CollisionBox(10, 8, 6, 9)
            ],
            numFrames: 2,
            frameRate: 1000 / 6,
            speedOffset: .8
        }
    ];
    //******************************************************************************
    /**
     * T-rex game character.
     * @param {HTMLCanvas} canvas
     * @param {Object} spritePos Positioning within image sprite.
     * @constructor
     */
    // 공룡 설정
    function Trex(canvas, spritePos) {
        // 위치 초기화
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.spritePos = spritePos;
        this.xPos = 0;
        this.yPos = 0;
        
        // Position when on the ground.
        // 땅에 붙혀 놓기 위한 변수들
        this.groundYPos = 0;
        this.currentFrame = 0;
        this.currentAnimFrames = [];
        this.blinkDelay = 0;
        this.blinkCount = 0;
        this.animStartTime = 0;
        this.timer = 0;
        this.msPerFrame = 1000 / FPS;
        this.config = Trex.config;

        // Current status. 현재 상태
        this.status = Trex.status.WAITING;

        // 점프 하고 있는지, 숙이는 중인지, 점프 속도 등
        this.jumping = false;
        this.ducking = false;
        this.attacking = false; //공격하는지 확인하는 플래그 변수
        this.jumpVelocity = 100;
        
        this.attackVelocity = 10; //공격 속도
        this.reachedMinHeight = false;
        this.reachedMindistance =false;
        this.speedDrop = false;
        this.jumpCount = 0;
        this.jumpspotX = 0;

        this.init();
    };


    /**
     * T-rex player config.
     * @enum {number}
     */
    // 사용자 공룡 설정
    Trex.config = {
        DROP_VELOCITY: -5,
        ATTACK_DROP: -2,
        GRAVITY: 0.6,
        HEIGHT: 47,
        HEIGHT_DUCK: 25,
        INIITAL_JUMP_VELOCITY: -10,
        attackVelocity: 10,
        INTRO_DURATION: 1500,
        MAX_JUMP_HEIGHT: 30,
        MIN_JUMP_HEIGHT: 30,
        MIN_ATTACK_DISTANCE: 10,
        MAX_ATTACK_DISTANCE: 200,
        SPEED_DROP_COEFFICIENT: 3,
        SPRITE_WIDTH: 262,
        START_X_POS: 50,
        WIDTH: 44,
        WIDTH_DUCK: 59
    };


    /**
     * Used in collision detection.
     * @type {Array<CollisionBox>}
     */
    Trex.collisionBoxes = { // x ,y , width, height
        DUCKING: [ // 숙일 때 충돌박스
            new CollisionBox(1, 18, 55, 25)
        ],
        RUNNING: [ // 달릴 때
            new CollisionBox(22, 0, 17, 16),
            new CollisionBox(1, 18, 30, 9),
            new CollisionBox(10, 35, 14, 8),
            new CollisionBox(1, 24, 29, 5),
            new CollisionBox(5, 30, 21, 4),
            new CollisionBox(9, 34, 15, 4)
        ]
    };


    /**
     * Animation states.
     * @enum {string}
     */
    // 공룡의 상태
    Trex.status = {
        CRASHED: 'CRASHED', // 부딪힘
        DUCKING: 'DUCKING', // 숙이는 중
        JUMPING: 'JUMPING', // 점프하는 중
        ATTACKING: 'ATTACKING', //공격중
        RUNNING: 'RUNNING', // 달리는 중
        WAITING: 'WAITING' // 기다리는 중 (초기 상태)
    };

    /**
     * Blinking coefficient.
     * @const
     */
    Trex.BLINK_TIMING = 7000;


    /**
     * Animation config for different states.
     * @enum {Object}
     */
    // 움직이는 공룡의 프레임 여기서 몸통 박치기 프레임 기능을 구현 함
    Trex.animFrames = {
        WAITING: {
            frames: [44, 0],
            msPerFrame: 1000 / 3
        },
        RUNNING: {
            frames: [88, 132],
            msPerFrame: 1000 / 12
        },
        CRASHED: {
            frames: [220],
            msPerFrame: 1000 / 60
        },
        JUMPING: {
            frames: [0],
            msPerFrame: 1000 / 60
        },
        DUCKING: {
            frames: [264, 323],
            msPerFrame: 1000 / 8
        },
        ATTACKING: {
            frames: [264, 323],
            msPerFrame: 1000/ 12
        }
    };
    //공룡의 함수들이 담김 여기에 공격하는 함수를 추가 해 줄 것이다.
    Trex.prototype = {
        /**
         * T-rex player initaliser.
         * Sets the t-rex to blink at random intervals.
         */
        init: function () {
            // 초기에 시작시 각 화면당 땅의 크기를 구해주어야한다.
            this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
                Runner.config.BOTTOM_PAD;
            // 현재 위치를 아까 구한 땅의 위치롷
            this.yPos = this.groundYPos;

            // 최소한의 점프 높이를 구하여 넣어줌
            this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;
            this.minattackdistance = this.xPos + this.config.MIN_ATTACK_DISTANCE;
            this.draw(0, 0);//0,0위치에 그려준다.
            this.update(0, Trex.status.WAITING);// 공룡의 상태를 기다려주는 것으로
        },

        /**
         * Setter for the jump velocity.
         * The approriate drop velocity is also set.
         */
        // 초기 점프 속도 설정
        setJumpVelocity: function (setting) {
            this.config.INIITAL_JUMP_VELOCITY = -setting;
            this.config.DROP_VELOCITY = -setting / 2;
        },

        /**
         * Set the animation status.
         * @param {!number} deltaTime
         * @param {Trex.status} status Optional status to switch to.
         */
        // 애니메이션의 상태를 업데이트 해주는 것이다.
        update: function (deltaTime, opt_status) {
            this.timer += deltaTime;

            // Update the status.
            if (opt_status) {
                this.status = opt_status;
                this.currentFrame = 0;
                this.msPerFrame = Trex.animFrames[opt_status].msPerFrame;
                this.currentAnimFrames = Trex.animFrames[opt_status].frames;
                
                if (opt_status == Trex.status.WAITING) {
                    this.animStartTime = getTimeStamp();
                    this.setBlinkDelay();
                }
            }

            // Game intro animation, T-rex moves in from the left.
            // 게임 시작 할 때 웨이팅 상태에서 왼쪽으로 옮김
            if (this.playingIntro && this.xPos < this.config.START_X_POS) {
                this.xPos += Math.round((this.config.START_X_POS /
                    this.config.INTRO_DURATION) * deltaTime);
            }
            // 현재 상태가 기다리는 상태면 blink를 함
            if (this.status == Trex.status.WAITING) {
                this.blink(getTimeStamp());
            } else {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);
            }// 기다리는 상태가 아니라면 현재 프레임에다가 새로 그려준다.

            // Update the frame position.
            // 위치 업데이트
            if (this.timer >= this.msPerFrame) {
                this.currentFrame = this.currentFrame ==// 현재 프레임이 움직이는 프레임보다 1 작다면 0으로 초기화 아니면 1더해줌
                    this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
                this.timer = 0;
            }

            // Speed drop becomes duck if the down key is still being pressed.
            // 아래를 누르고 있으면 속도가 감소된다.
            if (this.speedDrop && this.yPos == this.groundYPos) {
                this.speedDrop = false;
                this.setDuck(true);
            }
        },

        /**
         * Draw the t-rex to a particular position.
         * @param {number} x
         * @param {number} y
         */
        // 공룡을 특별한 위치로 그려줌
        draw: function (x, y) {
            var sourceX = x;
            var sourceY = y;
            // 지금 상태가 숙이고 부딪히지 않은 상태라면 Source폭은 숙이는 걸로  아니면 그냥 폭으로
            var sourceWidth = (this.ducking||this.attacking)&& this.status != Trex.status.CRASHED ?
                this.config.WIDTH_DUCK : this.config.WIDTH;
            var sourceHeight = this.config.HEIGHT;

            if (IS_HIDPI) {
                sourceX *= 2;
                sourceY *= 2;
                sourceWidth *= 2;
                sourceHeight *= 2;
            }

            // Adjustments for sprite sheet position.
            // 사물의 위치를 조정해줌
            sourceX += this.spritePos.x;
            sourceY += this.spritePos.y;

            // Ducking. 사물의 상태가 숙이고 부딪히지 않았을 때 수정중
            if ((this.ducking||this.attacking) && this.status != Trex.status.CRASHED) {
                this.canvasCtx.drawImage(Runner.imageSprite, sourceX, sourceY,
                    sourceWidth, sourceHeight,
                    this.xPos, this.yPos,
                    this.config.WIDTH_DUCK, this.config.HEIGHT);
            }
            else {
                // Crashed whilst ducking. Trex is standing up so needs adjustment.
                // 숙인 상태에서 부딪혔을 때, 공룡을 서있게 바꿔줘야한다.
                if ((this.ducking||this.attacking) && this.status == Trex.status.CRASHED) {
                    this.xPos++;
                }
                // Standing / running 서있는 이미지로 다시 그려줌
                this.canvasCtx.drawImage(Runner.imageSprite, sourceX, sourceY,
                    sourceWidth, sourceHeight,
                    this.xPos, this.yPos,
                    this.config.WIDTH, this.config.HEIGHT);
            }
        },

        /**
         * Sets a random time for the blink to happen.
         */
        // 랜덤으로 안보이게 하는 기능
        setBlinkDelay: function () {
            this.blinkDelay = Math.ceil(Math.random() * Trex.BLINK_TIMING);
        },

        /**
         * Make t-rex blink at random intervals.
         * @param {number} time Current time in milliseconds.
         */
        // 공룡이 주기적으로 깜빡거리게 함
        blink: function (time) {
            var deltaTime = time - this.animStartTime;

            if (deltaTime >= this.blinkDelay) {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);

                if (this.currentFrame == 1) {
                    // Set new random delay to blink.
                    this.setBlinkDelay();
                    this.animStartTime = time;
                    this.blinkCount++;
                }
            }
        },

        /**
         * Initialise a jump.
         * @param {number} speed
         */
        // 처음 점프 설정
        startJump: function (speed) {
            if (!this.jumping) {
                this.update(0, Trex.status.JUMPING);
                // 점프 상태로 업데이트한다.
                
                // 속도에 따라서 점프 속도를 설정함
                this.jumpVelocity = this.config.INIITAL_JUMP_VELOCITY - (speed / 10);
                // 점프 상태로 true
                this.jumping = true;
                // 최소 높이
                this.reachedMinHeight = false;
                // 속도 떨어지는 것을 false로 변경함
                
                this.speedDrop = false;
            }
        },

        /**
         * Jump is complete, falling down.
         */
        // 점프가 완료될 때 떨어지는 것
        endJump: function () {
            // 최소 점프 높이이고 떨어지는 속도보다 점프 속도가 낮을 때 점프 속도를 낮아지는 것으로 변경함
            if (this.reachedMinHeight &&
                this.jumpVelocity < this.config.DROP_VELOCITY) {
                this.jumpVelocity = this.config.DROP_VELOCITY;
            }
        },
        startattack: function(speed){
            if(!this.attacking){
                this.update(0, Trex.status.ATTACKING);
                // 공격 상태로 업데이트 한다.

                // 공격 상태 true
                this.attacking = true;   

                this.reachedMindistance = false;
            }
        
            
        },
        endattack: function() {
            if(this.reachedMindistance &&
                this.attackVelocity > this.config.ATTACK_DROP){
                    this.attackVelocity = this.config.ATTACK_DROP;
                }
        },
        /**
         * Update frame for a jump.
         * @param {number} deltaTime
         * @param {number} speed
         */
        // 점프하는 상황의 업데이트
        updateJump: function (deltaTime, speed) {
            var msPerFrame = Trex.animFrames[this.status].msPerFrame;
            var framesElapsed = deltaTime / msPerFrame;

            // Speed drop makes Trex fall faster.
            // 속도를 낮추는 것은 공룡이 빠르게 떨어지게 해준다.
            if (this.speedDrop) {
                this.yPos += Math.round(this.jumpVelocity *
                    this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
            } else {
                this.yPos += Math.round(this.jumpVelocity * framesElapsed);
            }

            // 점프 속도에 더해준다 중력과 프레임을 곱해서
            this.jumpVelocity += this.config.GRAVITY * framesElapsed;

            // 최소 높이에 도달 했을 때
            if (this.yPos < this.minJumpHeight || this.speedDrop) {
                this.reachedMinHeight = true;
                // 최소 높이 도달을 true로 변경
            }

            // 최고 높이에 도달 했을 때
            if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
                this.endJump();
                // 점프를 멈춤
            }

            // Back down at ground level. Jump completed.
            if (this.yPos > this.groundYPos) {
                this.reset();
                this.jumpCount++;
            }
            this.update(deltaTime);
        },
        updateattack: function(deltaTime, speed){ // 수정중
            var msPerFrame = Trex.animFrames[this.status].msPerFrame;
            var framesElapsed = deltaTime / msPerFrame;
            this.update(deltaTime);
            this.xPos += this.attackVelocity;

            // 공격 속도에 더해준다 중력과 프레임을 곱해서
            this.attackVelocity += this.config.GRAVITY * framesElapsed + 1; 

            // 최고 높이에 도달 했을 때
            if (this.xPos > this.config.MAX_ATTACK_DISTANCE && !this.reachedMindistance) {
                this.reachedMindistance = true;
            }

            if(this.reachedMinHeight){
                if(this.xPos < 25){
                    this.attacking = false;
                    this.reachedMindistance = false;
                    this.xPos = 25;
                    this.update(0, Trex.status.RUNNING);
                }
                this.endattack();
            }

            
        },

        /**
         * Set the speed drop. Immediately cancels the current jump.
         */
        // 속도를 떨어트리는 환경 숙이고 있을 때 속도가 빨라짐
        setSpeedDrop: function () {
            this.speedDrop = true;
            this.jumpVelocity = 1;
        },

        /**
         * @param {boolean} isDucking.
         */
        // 숙이는 설정
        setDuck: function (isDucking) {
            // 만약 숙이는 중인데 DUCKING 상태가 아니라면 숙이는 상태로 true
            if (isDucking && this.status != Trex.status.DUCKING) {
                this.update(0, Trex.status.DUCKING);
                this.ducking = true;
            } else if (this.status == Trex.status.DUCKING) { // 상태가 DUCKING면 숙이는 상태를 RUNNIGN로 업데이트
                this.update(0, Trex.status.RUNNING);
                this.ducking = false;// 후 숙인 설정을 false
            }
        },

        /**
         * Reset the t-rex to running at start of game.
         */
        // 게임을 시작하면 공룡의 설정을 초기화 해줌
        reset: function () {
            this.yPos = this.groundYPos;
            this.jumpVelocity = 0;
            this.attackVelocity = 10;
            this.jumping = false;
            this.attacking = false;
            this.ducking = false;
            this.update(0, Trex.status.RUNNING);
            this.midair = false;
            this.speedDrop = false;
            this.jumpCount = 0;
            
        }
    };

    /**
     * Handles displaying the distance meter.
     * @param {!HTMLCanvasElement} canvas
     * @param {Object} spritePos Image position in sprite.
     * @param {number} canvasWidth
     * @constructor
     */
    // 거리 미터를 디스플레이를 다뤄주는 함수
    function DistanceMeter(canvas, spritePos, canvasWidth) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.image = Runner.imageSprite;
        this.spritePos = spritePos;
        this.x = 0;
        this.y = 5;

        this.currentDistance = 0;
        this.maxScore = 0;
        this.highScore = 0;
        this.container = null;

        this.digits = [];
        this.acheivement = false;
        this.defaultString = '';
        this.flashTimer = 0;
        this.flashIterations = 0;
        this.invertTrigger = false;

        this.config = DistanceMeter.config;
        this.maxScoreUnits = this.config.MAX_DISTANCE_UNITS;
        this.init(canvasWidth);
    };


    /**
     * @enum {number}
     */
    DistanceMeter.dimensions = {
        WIDTH: 10,
        HEIGHT: 13,
        DEST_WIDTH: 11
    };


    /**
     * Y positioning of the digits in the sprite sheet.
     * X position is always 0.
     * @type {Array<number>}
     */
    // 
    DistanceMeter.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];


    /**
     * Distance meter config.
     * @enum {number}
     */
    // 거리 설정
    DistanceMeter.config = {
        // Number of digits.
        MAX_DISTANCE_UNITS: 5,

        // Distance that causes achievement animation.
        // 이 점수마다 깜빡 거린다.
        ACHIEVEMENT_DISTANCE: 300,

        // Used for conversion from pixel distance to a scaled unit.
        COEFFICIENT: 0.025,

        // Flash duration in milliseconds.
        FLASH_DURATION: 1000 / 4,

        // Flash iterations for achievement animation.
        FLASH_ITERATIONS: 3
    };

    // 거리 계산
    DistanceMeter.prototype = {
        /**
         * Initialise the distance meter to '00000'.
         * @param {number} width Canvas width in px.
         */
        init: function (width) {
            var maxDistanceStr = '';

            this.calcXPos(width);
            this.maxScore = this.maxScoreUnits;
            for (var i = 0; i < this.maxScoreUnits; i++) {
                this.draw(i, 0);
                this.defaultString += '0';
                maxDistanceStr += '9';
            }

            this.maxScore = parseInt(maxDistanceStr);
        },

        /**
         * Calculate the xPos in the canvas.
         * @param {number} canvasWidth
         */
        calcXPos: function (canvasWidth) {
            this.x = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
                (this.maxScoreUnits + 10));
        },
        /**
         * Draw a digit to canvas.
         * @param {number} digitPos Position of the digit.
         * @param {number} value Digit value 0-9.
         * @param {boolean} opt_highScore Whether drawing the high score.
         */
        // 점수 그리기
        draw: function (digitPos, value, opt_highScore) {
            var sourceWidth = DistanceMeter.dimensions.WIDTH;
            var sourceHeight = DistanceMeter.dimensions.HEIGHT;
            var sourceX = DistanceMeter.dimensions.WIDTH * value;
            var sourceY = 0;

            var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
            var targetY = this.y;
            var targetWidth = DistanceMeter.dimensions.WIDTH;
            var targetHeight = DistanceMeter.dimensions.HEIGHT;

            // For high DPI we 2x source values.
            if (IS_HIDPI) {
                sourceWidth *= 2;
                sourceHeight *= 2;
                sourceX *= 2;
            }

            sourceX += this.spritePos.x;
            sourceY += this.spritePos.y;

            this.canvasCtx.save();

            if (opt_highScore) {
                // Left of the current score.
                var highScoreX = this.x - (this.maxScoreUnits * 2) *
                    DistanceMeter.dimensions.WIDTH;
                this.canvasCtx.translate(highScoreX, this.y);
            } else {
                this.canvasCtx.translate(this.x, this.y);
            }

            this.canvasCtx.drawImage(this.image, sourceX, sourceY,
                sourceWidth, sourceHeight,
                targetX, targetY,
                targetWidth, targetHeight
            );

            this.canvasCtx.restore();
        },

        // attackdraw(1,attackcoubnt)
        attackdraw: function (digitPos, value) {
            var sourceWidth = DistanceMeter.dimensions.WIDTH;
            var sourceHeight = DistanceMeter.dimensions.HEIGHT;
            var sourceX = DistanceMeter.dimensions.WIDTH * value;
            var sourceY = 0;

            var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
            var targetY = this.y;
            var targetWidth = DistanceMeter.dimensions.WIDTH;
            var targetHeight = DistanceMeter.dimensions.HEIGHT;

            // For high DPI we 2x source values.
            if (IS_HIDPI) {
                sourceWidth *= 2;
                sourceHeight *= 2;
                sourceX *= 2;
            }

            sourceX += this.spritePos.x;
            // sourceY += this.spritePos.y;

            this.canvasCtx.save();
            this.canvasCtx.drawImage(this.image, sourceX, sourceY,
                sourceWidth, sourceHeight,
                targetX, targetY,
                targetWidth, targetHeight
            );

            this.canvasCtx.restore();
        },
        /**
         * Covert pixel distance to a 'real' distance.
         * @param {number} distance Pixel distance ran.
         * @return {number} The 'real' distance ran.
         */
        // 실제 이동 거리를 구해준다.
        getActualDistance: function (distance) {
            return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
        },
        /**
         * Update the distance meter.
         * @param {number} distance
         * @param {number} deltaTime
         * @return {boolean} Whether the acheivement sound fx should be played.
         */
        update: function (deltaTime, distance) {
            var paint = true;
            var playSound = false;
            
            if (!this.acheivement) {
                distance = this.getActualDistance(distance);
                
                // Score has gone beyond the initial digit count.
                if (distance > this.maxScore && this.maxScoreUnits ==
                    this.config.MAX_DISTANCE_UNITS) {
                    this.maxScoreUnits++;
                    this.maxScore = parseInt(this.maxScore + '9');
                } else {
                    this.distance = 0;
                }
                
                if (distance > 0) {
                    // Acheivement unlocked
                    if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
                        // Flash score and play sound.
                        this.acheivement = true;
                        this.flashTimer = 0;
                        playSound = true;
                    }
                    // Create a string representation of the distance with leading 0.
                    var distanceStr = (this.defaultString +
                        distance).substr(-this.maxScoreUnits);
                    
                    this.digits = distanceStr.split('');
                } else {
                    this.digits = this.defaultString.split('');
                }
            } else {
                // Control flashing of the score on reaching acheivement.
                if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
                    this.flashTimer += deltaTime;

                    if (this.flashTimer < this.config.FLASH_DURATION) {
                        paint = false;
                    } else if (this.flashTimer >
                        this.config.FLASH_DURATION * 2) {
                        this.flashTimer = 0;
                        this.flashIterations++;
                    }
                } else {
                    this.acheivement = false;
                    this.flashIterations = 0;
                    this.flashTimer = 0;
                }
            }

            // Draw the digits if not flashing.
            if (paint) {
                for (var i = this.digits.length - 1; i >= 0; i--) {
                    this.draw(i, parseInt(this.digits[i]));
                }
            }

            
            var tmp = parseInt(Attackcount / 100); // 값은 2
            this.attackdraw(0,Attackcount/100);

            this.drawHighScore();
            return playSound;
        },

        /**
         * Draw the high score.
         */
        // 최고 점수 그리기.
        drawHighScore: function () {
            this.canvasCtx.save();
            this.canvasCtx.globalAlpha = .8;
            for (var i = this.highScore.length - 1; i >= 0; i--) {
                this.draw(i, parseInt(this.highScore[i], 10), true);
            }
            this.canvasCtx.restore();
        },

        /**
         * Set the highscore as a array string.
         * Position of char in the sprite: H - 10, I - 11.
         * @param {number} distance Distance ran in pixels.
         */
        setHighScore: function (distance) {
            distance = this.getActualDistance(distance);
            var highScoreStr = (this.defaultString +
                distance).substr(-this.maxScoreUnits);

            this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
        },

        /**
         * Reset the distance meter back to '00000'.
         */
        reset: function () {
            this.update(0);
            this.acheivement = false;
        }
    };


    //******************************************************************************

    /**
     * Cloud background item.
     * Similar to an obstacle object but without collision boxes.
     * @param {HTMLCanvasElement} canvas Canvas element.
     * @param {Object} spritePos Position of image in sprite.
     * @param {number} containerWidth
     */
    // 배경 사물인 구름
    // 장애물과 유사한 형식이지만 충돌 박스가 없다.
    // 이거를 잘 이용하면 무적 버전 사용 가능 할지도모름. 이용 생각
    function Cloud(canvas, spritePos, containerWidth) {
        this.canvas = canvas;
        this.canvasCtx = this.canvas.getContext('2d');
        this.spritePos = spritePos;
        this.containerWidth = containerWidth;
        this.xPos = containerWidth;
        this.yPos = 0;
        this.remove = false;
        this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
            Cloud.config.MAX_CLOUD_GAP);

        this.init();
    };


    /**
     * Cloud object config.
     * @enum {number}
     */
    Cloud.config = {
        HEIGHT: 14,
        MAX_CLOUD_GAP: 400,
        MAX_SKY_LEVEL: 30,
        MIN_CLOUD_GAP: 100,
        MIN_SKY_LEVEL: 71,
        WIDTH: 46
    };

    // 회복 물약 같은거 이용하면 사용할 함수
    Cloud.prototype = {
        /**
         * Initialise the cloud. Sets the Cloud height.
         */
        init: function () {
            this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
                Cloud.config.MIN_SKY_LEVEL);
            this.draw();
        },

        /**
         * Draw the cloud.
         */
        // 구름 그리기
        draw: function () {
            this.canvasCtx.save();
            var sourceWidth = Cloud.config.WIDTH;
            var sourceHeight = Cloud.config.HEIGHT;

            if (IS_HIDPI) {
                sourceWidth = sourceWidth * 2;
                sourceHeight = sourceHeight * 2;
            }

            this.canvasCtx.drawImage(Runner.imageSprite, this.spritePos.x,
                this.spritePos.y,
                sourceWidth, sourceHeight,
                this.xPos, this.yPos,
                Cloud.config.WIDTH, Cloud.config.HEIGHT);

            this.canvasCtx.restore();
        },

        /**
         * Update the cloud position.
         * @param {number} speed
         */
        update: function (speed) {
            if (!this.remove) {
                this.xPos -= Math.ceil(speed);
                this.draw();

                // Mark as removeable if no longer in the canvas.
                if (!this.isVisible()) {
                    this.remove = true;
                }
            }
        },

        /**
         * Check if the cloud is visible on the stage.
         * @return {boolean}
         */
        isVisible: function () {
            return this.xPos + Cloud.config.WIDTH > 0;
        }
    };


    //******************************************************************************

    /**
     * Nightmode shows a moon and stars on the horizon.
     */
    // 나이트모드는 상관x
    function NightMode(canvas, spritePos, containerWidth) {
        this.spritePos = spritePos;
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.xPos = containerWidth - 50;
        this.yPos = 30;
        this.currentPhase = 0;
        this.opacity = 0;
        this.containerWidth = containerWidth;
        this.stars = [];
        this.drawStars = false;
        this.placeStars();
    };

    /**
     * @enum {number}
     */
    NightMode.config = {
        FADE_SPEED: 0.035,
        HEIGHT: 40,
        MOON_SPEED: 0.25,
        NUM_STARS: 2,
        STAR_SIZE: 9,
        STAR_SPEED: 0.3,
        STAR_MAX_Y: 70,
        WIDTH: 20
    };

    NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

    NightMode.prototype = {
        /**
         * Update moving moon, changing phases.
         * @param {boolean} activated Whether night mode is activated.
         * @param {number} delta
         */
        update: function (activated, delta) {
            // Moon phase.
            if(hard) activated = true;
            if (activated && this.opacity == 0) {
                this.currentPhase++;

                if (this.currentPhase >= NightMode.phases.length) {
                    this.currentPhase = 0;
                }
            }

            // Fade in / out.
            if (activated && (this.opacity < 1 || this.opacity == 0)) {
                this.opacity += NightMode.config.FADE_SPEED;
            } else if (this.opacity > 0) {
                this.opacity -= NightMode.config.FADE_SPEED;
            }

            // Set moon positioning.
            if (this.opacity > 0) {
                this.xPos = this.updateXPos(this.xPos, NightMode.config.MOON_SPEED);

                // Update stars.
                if (this.drawStars) {
                    for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
                        this.stars[i].x = this.updateXPos(this.stars[i].x,
                            NightMode.config.STAR_SPEED);
                    }
                }
                this.draw();
            } else {
                this.opacity = 0;
                this.placeStars();
            }
            this.drawStars = true;
        },

        updateXPos: function (currentPos, speed) {
            if (currentPos < -NightMode.config.WIDTH) {
                currentPos = this.containerWidth;
            } else {
                currentPos -= speed;
            }
            return currentPos;
        },

        draw: function () {
            var moonSourceWidth = this.currentPhase == 3 ? NightMode.config.WIDTH * 2 :
                NightMode.config.WIDTH;
            var moonSourceHeight = NightMode.config.HEIGHT;
            var moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase];
            var moonOutputWidth = moonSourceWidth;
            var starSize = NightMode.config.STAR_SIZE;
            var starSourceX = Runner.spriteDefinition.LDPI.STAR.x;

            if (IS_HIDPI) {
                moonSourceWidth *= 2;
                moonSourceHeight *= 2;
                moonSourceX = this.spritePos.x +
                    (NightMode.phases[this.currentPhase] * 2);
                starSize *= 2;
                starSourceX = Runner.spriteDefinition.HDPI.STAR.x;
            }

            this.canvasCtx.save();
            this.canvasCtx.globalAlpha = this.opacity;

            // Stars.
            if (this.drawStars) {
                for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
                    this.canvasCtx.drawImage(Runner.imageSprite,
                        starSourceX, this.stars[i].sourceY, starSize, starSize,
                        Math.round(this.stars[i].x), this.stars[i].y,
                        NightMode.config.STAR_SIZE, NightMode.config.STAR_SIZE);
                }
            }

            // Moon.
            this.canvasCtx.drawImage(Runner.imageSprite, moonSourceX,
                this.spritePos.y, moonSourceWidth, moonSourceHeight,
                Math.round(this.xPos), this.yPos,
                moonOutputWidth, NightMode.config.HEIGHT);

            this.canvasCtx.globalAlpha = 1;
            this.canvasCtx.restore();
        },

        // Do star placement.
        placeStars: function () {
            var segmentSize = Math.round(this.containerWidth /
                NightMode.config.NUM_STARS);

            for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
                this.stars[i] = {};
                this.stars[i].x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
                this.stars[i].y = getRandomNum(0, NightMode.config.STAR_MAX_Y);

                if (IS_HIDPI) {
                    this.stars[i].sourceY = Runner.spriteDefinition.HDPI.STAR.y +
                        NightMode.config.STAR_SIZE * 2 * i;
                } else {
                    this.stars[i].sourceY = Runner.spriteDefinition.LDPI.STAR.y +
                        NightMode.config.STAR_SIZE * i;
                }
            }
        },

        reset: function () {
            this.currentPhase = 0;
            this.opacity = 0;
            this.update(false);
        }

    };


    //******************************************************************************

    /**
     * Horizon Line.
     * Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
     * @param {HTMLCanvasElement} canvas
     * @param {Object} spritePos Horizon position in sprite.
     * @constructor
     */
    function HorizonLine(canvas, spritePos) {
        this.spritePos = spritePos;
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.sourceDimensions = {};
        this.dimensions = HorizonLine.dimensions;
        this.sourceXPos = [this.spritePos.x, this.spritePos.x +
            this.dimensions.WIDTH];
        this.xPos = [];
        this.yPos = 0;
        this.bumpThreshold = 0.5;

        this.setSourceDimensions();
        this.draw();
    };


    /**
     * Horizon line dimensions.
     * @enum {number}
     */
    HorizonLine.dimensions = {
        WIDTH: 600,
        HEIGHT: 12,
        YPOS: 127
    };


    HorizonLine.prototype = {
        /**
         * Set the source dimensions of the horizon line.
         */
        setSourceDimensions: function () {

            for (var dimension in HorizonLine.dimensions) {
                if (IS_HIDPI) {
                    if (dimension != 'YPOS') {
                        this.sourceDimensions[dimension] =
                            HorizonLine.dimensions[dimension] * 2;
                    }
                } else {
                    this.sourceDimensions[dimension] =
                        HorizonLine.dimensions[dimension];
                }
                this.dimensions[dimension] = HorizonLine.dimensions[dimension];
            }

            this.xPos = [0, HorizonLine.dimensions.WIDTH];
            this.yPos = HorizonLine.dimensions.YPOS;
        },

        /**
         * Return the crop x position of a type.
         */
        getRandomType: function () {
            return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
        },

        /**
         * Draw the horizon line.
         */
        draw: function () {
            this.canvasCtx.drawImage(Runner.imageSprite, this.sourceXPos[0],
                this.spritePos.y,
                this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
                this.xPos[0], this.yPos,
                this.dimensions.WIDTH, this.dimensions.HEIGHT);

            this.canvasCtx.drawImage(Runner.imageSprite, this.sourceXPos[1],
                this.spritePos.y,
                this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
                this.xPos[1], this.yPos,
                this.dimensions.WIDTH, this.dimensions.HEIGHT);
        },

        /**
         * Update the x position of an indivdual piece of the line.
         * @param {number} pos Line position.
         * @param {number} increment
         */
        updateXPos: function (pos, increment) {
            var line1 = pos;
            var line2 = pos == 0 ? 1 : 0;

            this.xPos[line1] -= increment;
            this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

            if (this.xPos[line1] <= -this.dimensions.WIDTH) {
                this.xPos[line1] += this.dimensions.WIDTH * 2;
                this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
                this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
            }
        },

        /**
         * Update the horizon line.
         * @param {number} deltaTime
         * @param {number} speed
         */
        update: function (deltaTime, speed) {
            var increment = Math.floor(speed * (FPS / 1000) * deltaTime);

            if (this.xPos[0] <= 0) {
                this.updateXPos(0, increment);
            } else {
                this.updateXPos(1, increment);
            }
            this.draw();
        },

        /**
         * Reset horizon to the starting position.
         */
        reset: function () {
            this.xPos[0] = 0;
            this.xPos[1] = HorizonLine.dimensions.WIDTH;
        }
    };


    //******************************************************************************

    /**
     * Horizon background class.
     * @param {HTMLCanvasElement} canvas
     * @param {Object} spritePos Sprite positioning.
     * @param {Object} dimensions Canvas dimensions.
     * @param {number} gapCoefficient
     * @constructor
     */
    function Horizon(canvas, spritePos, dimensions, gapCoefficient) {
        this.canvas = canvas;
        this.canvasCtx = this.canvas.getContext('2d');
        this.config = Horizon.config;
        this.dimensions = dimensions;
        this.gapCoefficient = gapCoefficient;
        this.obstacles = [];
        this.obstacleHistory = [];
        this.horizonOffsets = [0, 0];
        this.cloudFrequency = this.config.CLOUD_FREQUENCY;
        this.spritePos = spritePos;
        this.nightMode = null;

        // Cloud
        this.clouds = [];
        this.cloudSpeed = this.config.BG_CLOUD_SPEED;

        // Horizon
        this.horizonLine = null;
        this.init();
    };


    /**
     * Horizon config.
     * @enum {number}
     */
    Horizon.config = {
        BG_CLOUD_SPEED: 0.2,
        BUMPY_THRESHOLD: .3,
        CLOUD_FREQUENCY: .5,
        HORIZON_HEIGHT: 16,
        MAX_CLOUDS: 6
    };


    Horizon.prototype = {
        /**
         * Initialise the horizon. Just add the line and a cloud. No obstacles.
         */
        init: function () {
            this.addCloud();
            this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
            this.nightMode = new NightMode(this.canvas, this.spritePos.MOON,
                this.dimensions.WIDTH);
        },

        /**
         * @param {number} deltaTime
         * @param {number} currentSpeed
         * @param {boolean} updateObstacles Used as an override to prevent
         *     the obstacles from being updated / added. This happens in the
         *     ease in section.
         * @param {boolean} showNightMode Night mode activated.
         */
        update: function (deltaTime, currentSpeed, updateObstacles, showNightMode) {
            this.runningTime += deltaTime;
            this.horizonLine.update(deltaTime, currentSpeed);
            this.nightMode.update(showNightMode);
            this.updateClouds(deltaTime, currentSpeed);

            if (updateObstacles) {
                this.updateObstacles(deltaTime, currentSpeed);
            }
        },

        /**
         * Update the cloud positions.
         * @param {number} deltaTime
         * @param {number} currentSpeed
         */
        updateClouds: function (deltaTime, speed) {
            var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
            var numClouds = this.clouds.length;

            if (numClouds) {
                for (var i = numClouds - 1; i >= 0; i--) {
                    this.clouds[i].update(cloudSpeed);
                }

                var lastCloud = this.clouds[numClouds - 1];

                // Check for adding a new cloud.
                if (numClouds < this.config.MAX_CLOUDS &&
                    (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
                    this.cloudFrequency > Math.random()) {
                    this.addCloud();
                }

                // Remove expired clouds.
                this.clouds = this.clouds.filter(function (obj) {
                    return !obj.remove;
                });
            } else {
                this.addCloud();
            }
        },

        /**
         * Update the obstacle positions.
         * @param {number} deltaTime
         * @param {number} currentSpeed
         */
        updateObstacles: function (deltaTime, currentSpeed) {
            // Obstacles, move to Horizon layer.
            var updatedObstacles = this.obstacles.slice(0);

            for (var i = 0; i < this.obstacles.length; i++) {
                var obstacle = this.obstacles[i];
                obstacle.update(deltaTime, currentSpeed);

                // Clean up existing obstacles.
                if (obstacle.remove) {
                    updatedObstacles.shift();
                }
            }
            this.obstacles = updatedObstacles;

            if (this.obstacles.length > 0) {
                var lastObstacle = this.obstacles[this.obstacles.length - 1];

                if (lastObstacle && !lastObstacle.followingObstacleCreated &&
                    lastObstacle.isVisible() &&
                    (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
                    this.dimensions.WIDTH) {
                    this.addNewObstacle(currentSpeed);
                    lastObstacle.followingObstacleCreated = true;
                }
            } else {
                // Create new obstacles.
                this.addNewObstacle(currentSpeed);
            }
        },

        removeFirstObstacle: function () {
            this.obstacles.shift();
        },

        /**
         * Add a new obstacle.
         * @param {number} currentSpeed
         */
        addNewObstacle: function (currentSpeed) {
            var obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1);
            var obstacleType = Obstacle.types[obstacleTypeIndex];

            // Check for multiples of the same type of obstacle.
            // Also check obstacle is available at current speed.
            if (this.duplicateObstacleCheck(obstacleType.type) ||
                currentSpeed < obstacleType.minSpeed) {
                this.addNewObstacle(currentSpeed);
            } else {
                var obstacleSpritePos = this.spritePos[obstacleType.type];

                this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
                    obstacleSpritePos, this.dimensions,
                    this.gapCoefficient, currentSpeed, obstacleType.width));

                this.obstacleHistory.unshift(obstacleType.type);

                if (this.obstacleHistory.length > 1) {
                    this.obstacleHistory.splice(Runner.config.MAX_OBSTACLE_DUPLICATION);
                }
            }
        },

        /**
         * Returns whether the previous two obstacles are the same as the next one.
         * Maximum duplication is set in config value MAX_OBSTACLE_DUPLICATION.
         * @return {boolean}
         */
        duplicateObstacleCheck: function (nextObstacleType) {
            var duplicateCount = 0;

            for (var i = 0; i < this.obstacleHistory.length; i++) {
                duplicateCount = this.obstacleHistory[i] == nextObstacleType ?
                    duplicateCount + 1 : 0;
            }
            return duplicateCount >= Runner.config.MAX_OBSTACLE_DUPLICATION;
        },

        /**
         * Reset the horizon layer.
         * Remove existing obstacles and reposition the horizon line.
         */
        reset: function () {
            this.obstacles = [];
            this.horizonLine.reset();
            this.nightMode.reset();
        },

        /**
         * Update the canvas width and scaling.
         * @param {number} width Canvas width.
         * @param {number} height Canvas height.
         */
        resize: function (width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
        },

        /**
         * Add a new cloud to the horizon.
         */
        addCloud: function () {
            this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD,
                this.dimensions.WIDTH));
        }
    };
})();



// 처음 페이지가 불렸을 때 러너 객체 생성
function onDocumentLoad() {
    new Runner('.interstitial-wrapper');
}


document.addEventListener('DOMContentLoaded', onDocumentLoad);
