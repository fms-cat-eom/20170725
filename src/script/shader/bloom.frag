#define V vec2(0.,1.)
#define saturate(i) clamp(i,0.,1.)
#define PI 3.14159265
#define SAMPLES 40

// ------

precision highp float;

uniform vec2 resolution;
uniform bool isVert;
uniform sampler2D texture;

uniform float gaussVar;

float gaussian( float _x, float _v ) {
  return 1.0 / sqrt( 2.0 * PI * _v ) * exp( - _x * _x / 2.0 / _v );
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 bv = ( isVert ? vec2( 0.0, 1.0 ) : vec2( 1.0, 0.0 ) ) / resolution;

  vec3 sum = V.xxx;
  for ( int i = -SAMPLES; i <= SAMPLES; i ++ ) {
    vec2 v = saturate( uv + bv * float( i ) );
    vec3 tex = texture2D( texture, v ).xyz;
    tex = max( vec3( 0.0 ), tex - 0.1 ) * 2.0;
    float mul = gaussian( abs( float( i ) ), gaussVar );
    sum += tex * mul;
  }

  if ( isVert ) {
    sum = smoothstep( 0.0, 1.0, sum ) * 0.04;
  }

  gl_FragColor = vec4( sum, 1.0 );
}
