import { css } from '@linaria/core';
import Map from './components/Map';

function App() {
  return (
    <main>
      <h1 className={css`
        display:none;
        @media (min-width: 720px) {
          display: block;
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          text-shadow: 
            0 0 10px var(--honeydew),
            0 0 10px var(--honeydew);
          z-index: 999;
          margin: 1rem;
          line-height: 1em;
          // backdrop-filter: invert();
          // -webkit-text-stroke: 1px white;
        }
      `}>sunsets on a map</h1>
      <Map />
    </main>
  )
}

export default App
