export function renderFallbackPoster(container, manifest, colors, note) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const context = canvas.getContext('2d');
  context.fillStyle = colors.void;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = colors.rule;
  context.lineWidth = 4;
  context.strokeRect(45, 42, canvas.width - 90, canvas.height - 84);

  const visible = manifest.bodies.slice(0, 36);
  visible.forEach((body) => {
    const width = body.massClass === 'heavy' ? 150 : body.massClass === 'mid' ? 104 : 52;
    const height = body.massClass === 'heavy' ? 64 : body.massClass === 'mid' ? 42 : 34;
    const x = canvas.width / 2 + body.slot.x * 430 - width / 2;
    const y = canvas.height / 2 - body.slot.y * 245 - height / 2;
    context.fillStyle =
      body.massClass === 'heavy'
        ? colors.heavy
        : body.massClass === 'mid'
          ? colors.mid
          : colors.light;
    context.globalAlpha = body.id ? 0.88 : 0.34;
    context.fillRect(x, y, width, height);
    if (body.label) {
      context.globalAlpha = 1;
      context.fillStyle = colors.text;
      context.font = '700 20px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(body.label, x + width / 2, y + height / 2);
    }
  });

  context.globalAlpha = 1;
  context.strokeStyle = colors.charge;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(80, 515);
  context.lineTo(245, 408);
  context.stroke();
  context.fillStyle = colors.chargeMax;
  context.beginPath();
  context.arc(80, 515, 33, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = colors.void;
  context.font = '700 14px monospace';
  context.fillText('UNKNOWN', 80, 515);

  const image = document.createElement('img');
  image.className = 'unfolding-machine__poster';
  image.src = canvas.toDataURL('image/png');
  image.alt = 'The Unfolding Machine charged collision chamber, shown as a static poster.';
  const message = document.createElement('p');
  message.className = 'unfolding-machine__fallback-note';
  message.textContent = note;
  container.prepend(image);
  container.append(message);
}
