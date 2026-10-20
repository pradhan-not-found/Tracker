import { Spread } from './Spread'
import { ChevronDown } from './icons'
import { faqs } from '@/lib/faq'

export function Faq() {
  return (
    <Spread id="faq" label="Questions" title={['Questions,', 'answered.']}>
      <div className="split">
        <p className="split-intro" data-reveal>
          <span data-reveal-item>Short answers to what people ask before installing.</span>
        </p>
        <div className="faq" data-reveal>
          {faqs.map((f, i) => (
            <details key={f.q} data-reveal-item style={{ ['--i' as string]: i }}>
              <summary>
                <span className="faq-q">{f.q}</span>
                <ChevronDown className="faq-chev" />
              </summary>
              <div className="faq-a">
                <p>
                  {f.a}
                  {f.link && (
                    <>
                      {' '}
                      <a href={f.link.href} target="_blank" rel="noopener noreferrer">
                        {f.link.text}
                      </a>
                      {f.link.after}
                    </>
                  )}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </Spread>
  )
}
