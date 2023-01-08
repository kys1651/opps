let canvas = document.querySelector('#canvas');
let ctx = canvas.getContext('2d'); // context 란 뜻으로 ctx

canvas.width = window.innerWidth - 100;
canvas.height = window.innerHeight - 100;

// 바닥선
ctx.beginPath();
ctx.moveTo(0, 250);
ctx.lineTo(600, 250);
ctx.stroke();

// 임시캐릭터
ctx.fillStyle = 'green';
ctx.fillRect(10, 10, 50, 50);

let dino = {
    x: 10, 
    y: 200, 
    width: 50, 
    height: 50, 
    draw(){
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
dino.draw();