import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayPalFieldEditorTabs from '../PayPalFieldEditorTabs';

// Mock the PaymentProvider and other dependencies
jest.mock('../../PaymentContext', () => ({
  PaymentProvider: ({ children }) => <div data-testid="payment-provider">{children}</div>,
  usePaymentContext: () => ({
    userId: 'test-user-123',
    formId: 'test-form-456'
  })
}));

jest.mock('../../shared/MerchantAccountSelector', () => {
  return function MerchantAccountSelector({ selectedMerchantId, onMerchantChange, onCapabilitiesChange }) {
    return (
      <div data-testid="merchant-account-selector">
        <input
          data-testid="merchant-input"
          value={selectedMerchantId || ''}
          onChange={(e) => {
            onMerchantChange(e.target.value);
            onCapabilitiesChange({ cards: true, googlePay: true, venmo: false });
          }}
          placeholder="Select merchant"
        />
      </div>
    );
  };
});

jest.mock('../../shared/ProductManagementModal', () => {
  return function ProductManagementModal({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="product-management-modal">
        <button onClick={onClose}>Close Product Modal</button>
      </div>
    ) : null;
  };
});

jest.mock('./SubscriptionManagementModal', () => {
  return function SubscriptionManagementModal({ isOpen, onClose }) {
    return isOpen ? (
      <div data-testid="subscription-management-modal">
        <button onClick={onClose}>Close Subscription Modal</button>
      </div>
    ) : null;
  };
});

jest.mock('./PayPalFieldHelp', () => ({
  HelpTooltip: ({ title, content }) => <span data-testid="help-tooltip" title={content}>{title}</span>,
  ContextualHelp: ({ section }) => <span data-testid="contextual-help">{section}</span>
}));

describe('PayPalFieldEditorTabs Integration Tests', () => {
  const mockOnUpdateField = jest.fn();
  const mockSelectedField = {
    id: 'test-field-123',
    type: 'paypal_payment',
    subFields: {
      merchantAccountId: 'test-merchant-456',
      paymentType: 'product_wise',
      amount: {
        type: 'fixed',
        value: 25.99,
        currency: 'USD',
        minAmount: '',
        maxAmount: ''
      },
      paymentMethods: {
        paypal: true,
        cards: true,
        venmo: false,
        googlePay: true
      },
      behavior: {
        collectBillingAddress: false,
        collectShippingAddress: true
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render with loading state initially', () => {
      render(
        <PayPalFieldEditorTabs
          selectedField={mockSelectedField}
          onUpdateField={mockOnUpdateField}
          userId="test-user"
          formId="test-form"
        />
      );

      expect(screen.getByText('Loading payment configuration...')).toBeInTheDocument();
    });

    it('should initialize state from subFields', async () => {
      render(
        <PayPalFie });
});
    });
 Than(5);essunt).toBeLtialRenderCoinierCount - finalRend   expect(length;
   ls..mock.calpy = renderSerCountndinalRe     const fnders
 re-reexcessive use ld not ca/ Shou
      /b);
k(accountTalicvent.c      fireE
 Type');mentccount & PayetByText('Aen.gab = scret accountT    cons
  ;
ancedTab)lick(advnt.c fireEve    tings');
 ced SetText('AdvangetByab = screen.ancedT adv   const

   configTab);t.click(fireEven');
      gurationnfit Cot('Paymenen.getByTexTab = screnfigco   const mes
   e tiabs multipl/ Switch t

      /ength;alls.l.mock.cSpyder renCount =erlRendnitia     const i  });

 );
    heDocument(BeInT.to))ion'ratnt Configumeayt('PayPal PTexcreen.getBy    expect(s   => {
 ) itFor((t wa      awai    );


      />    est-form"
="tormId          fr"
"test-useuserId=
          ield}ateF{mockOnUpdeld=teFi    onUpda
      }lectedField{mockSeield=dFecte      sel
    stComponent       <Tender(
 

      re};
      .props} />;itorTabs {..dEd <PayPalFiel   return     nderSpy();
      re
  > {) =(propsomponent = stC  const Te  
    
    ; jest.fn()py =nst renderSco   
   c () => {ches', asynon tab switre-renders y essarcause unnecld not ('shou
    it) => {formance', (('Perescribe;

  d
  }));
    });nt(umeeDocoBeInThion...')).turatyment configng padit('Loaexn.getByT(scree      expect    );

/>
    
      ""test-formId=        formr"
  est-used="t    userI   ld}
   ateFie={mockOnUpdeFieldat    onUpdld}
      alidFie={invectedFieldsel  bs
        orTaPalFieldEdit     <Pay   ender(
   r

   
      };pe'valid_ty   type: 'ind,
     ectedFielel  ...mockS    
  eld = {dFit invali cons
      {y', () =>racefull type geldinvalid fiould handle sh  it('  });

  nt();
  meInTheDocuoBe.')).tion..uratigonfnt cing paymeyText('Loadeen.getBpect(screx

      
      );      />form"
  est-"tformId=
          r"="test-useserId    uld}
      ieUpdateF{mockOnld= onUpdateFie      }
   nullField={lected   se
       rTabsFieldEdito     <PayPalender(
    r=> {
     ) ', (lyefulracld gectedFieng selhandle missiit('should    ) => {
 ', (dlingr Hancribe('Erro
  des);
  });

    } 1000 });meout:, { ti    }lled();
  aveBeenCaield).toHpdateFpect(mockOnU ex     ) => {
  itFor((wa     await ateField
 call onUpdlly ventuaould e// Sh

      sCheckbox);ngAddresilliser.click(b uaitaw    ress');
  illing Addlect BlText('ColetByLabescreen.gckbox = ddressChellingAt bi   consion
   s collectling addresoggle bil      // Tn);

iorSectioehav.click(b fireEventr');
     avioField BehText('creen.getBytion = shaviorSec    const beection
   behavior snd // Expa);

     ncedTabck(advaEvent.cli
      fires');d Setting'AdvancegetByText( = screen. advancedTab   constced tab
   van to ad/ Switch

      /   });   ment();
eInTheDocutoBon')).guratit ConfienayPal PaymByText('Pget(screen.expect       > {
 (() =itFor await wa        );

/>
           "
-formestmId="t        for-user"
  test   userId="      
 eField}ockOnUpdatateField={m     onUpd    ld}
 ctedFieockSeleField={mselected      orTabs
    itayPalFieldEd <P(
       der ren     
      
.setup();erEventst user = us     con() => {
 ges', async s chaningsettor havid handle be'shoulit({
    ', () => ced Settingse('Advan describ
   });
 });
t();
   cumeneDoeInThmodal')).toBmanagement-n-ptiod('subscriTestI.getByscreenect(exp
      uld openModal sho     // Btn);

 onstiscripeSubick(managent.cl    fireEvs');
  criptionSubst('Manage yTexn.getBsBtn = screetioneSubscripmanagonst on
      cuttons bbscriptinage suck ma Cli      //b);

nfigTalick(covent.c      fireEtion');
raguonfit CaymenByText('Preen.get= scb gTaconfi      const n tab
atioto configurtch wi
      // S      });
();
mentDocunTheBeIn')).toratio ConfiguaymentPayPal P('etByText.gct(screen    expe
    For(() => {wait wait  a
       );

           />rm"
fot-Id="tesorm f      ser"
   "test-u    userId=      eField}
OnUpdatmockeld={dateFi     onUp}
     tionField={subscripeldectedFi   sel       bs
ditorTaalFieldEyP     <Paender(
   
      r  };

           }
 ion'riptubscpe: 'smentTy        pays,
  .subFieldieldtedFkSelec   ...moc{
       Fields:       subld,
  ectedFie  ...mockSel    {
   ield =criptionF  const subs
    ) => {, async (t type'aymenbscription pfor suement modal anagion m subscript'should open it(    });

();
   entnTheDocumt.toBeIal')).noment-modduct-manage('proyByTestIderen.quxpect(scre  ese
     clohould sModal

      // eBtn);ick(closvent.clfireE      al');
oduct M ProdloseetByText('Ceen.gscrtn = loseB c     constose modal
     // Cl
  cument();
nTheDol')).toBeIgement-modaproduct-manatByTestId('(screen.gepect      ex open
uld// Modal sho  tn);

    uctsBageProdck(manEvent.clire     fi');
 uctsnage Prod('MaetByTextn = screen.gsBtucteProdnagnst ma     coutton
 roducts bnage pick ma      // ClfigTab);

.click(con fireEventon');
      ConfiguratiPaymentgetByText('n.eeigTab = scrt confnsb
      couration taigo confwitch t   // S});

       t();
  enheDocumtoBeInTation')).ent Configural PaymPayPyText('(screen.getBxpect{
        e() => aitFor( w     await);

 
          />   
 st-form""teId=     form     user"
t-rId="tes     use
     Field}pdatemockOnUteField={daonUp        }
  dFieldSelecte{mockdField=selecte         rTabs
 FieldEdito  <PayPal   (
      render=> {
    () l', asyncmodant anagemee product mclosd open and ul    it('sho() => {
nt', l Managemecribe('Moda  des;
  });

t();
    })eDocumen.toBeInThe')) availablment methodsother payy - no on onltt bualyText('PayPtBeen.gescrexpect(      ();
cumentnTheDo)).toBeIod'ent MethymyText('Pan.getBreeect(scs
      expt methodmenpayof ce instead  notial onlyPayPShould show   // 

    nfigTab);t.click(coeneEvir    fon');
  guratiayment ConfigetByText('P= screen.configTab nst       co
ration tabo configuch tit
      // Sw  });
ent();
    eInTheDocumn')).toBonfiguratioent C'PayPal PaymByText(en.getpect(scre      ex() => {
  ait waitFor(      aw    );

      />
  orm"
  est-fd="tmIfor          st-user"
"te userId=       
  dateField}nUpd={mockOteFielUpda          onld}
onButtonFieeld={donati  selectedFi
        TabsEditorPalField       <Pay render(
 ;

      }     
        }
on_button''donatimentType: ay       pFields,
   ield.subctedFkSelemoc    ...   : {
     subFields  eld,
    dFickSelectemo
        ...ield = {ionButtonFconst donat
      => {() ', async button typeor donation_t methods f show paymend nothoul   it('s});

 ;
    heDocument()/)).toBeInTle PayelText(/Googabreen.getByL(scxpect);
      eument(heDocBeInTds')).to Car/Debitxt('CredittByLabelTect(screen.geexpe
      ent();umDoc).toBeInThet('PayPal')LabelTexscreen.getBy   expect(oxes
   ethod checkb maymentd show p  // Shoul

    );ctionentMethodsSeick(paymfireEvent.cl;
       Methods')Paymentxt('een.getByTescrn = SectiohodsmentMetst pay con     ds section
thoyment me show pa // Should
     ;
igTab)onf(cEvent.clickire');
      ftionConfigurat('Payment etByTexeen.g= scrt configTab   consab
    ration to configuwitch t// S
       });
);
     ument(DoctoBeInTheguration')).yment Confit('PayPal PagetByTexect(screen.xp
        e> {() =r(t waitFoai

      aw    );    />
     
 "est-formId="t      form
    er"test-us="  userId       teField}
 {mockOnUpdaeld=dateFi    onUp
      ield}ountFAm={customctedFieldele         sTabs
 oreldEditPayPalFi
        <r(ende
      r};
      }
  unt'
      custom_amo: 'paymentType          subFields,
eld.Filected  ...mockSe
        : {  subFieldsld,
      SelectedFie ...mock     d = {
  FielntAmou custom  const
    ync () => {, aspes'ment tyorted pay for suppmethodspayment ow ('should sh
    it() => {tion', ds Configurathot Mebe('Paymendescri;

  ;
  })
    })0 });timeout: 100     }, { lled();
 aveBeenCatoH).ateFieldkOnUpdxpect(moc{
        eor(() => await waitF      
nUpdateFieldall oally cventu eandstate ould update     // Sh9');

  ant-78ew-merch, 'nInput(merchant.typeait useraw    
  ntInput);lear(merchaser.c  await u   ut');
 t-inphan('merctIdetByTesen.gre = scrchantInputmet   cons
    e merchant // Chang
     );
tSection(merchan.click   fireEvent');
   ntnt Accouxt('MerchayTegetBn.reeSection = sc merchant   const  t section
 nt accounrchapand me // Ex

     
      });();ocumentoBeInTheD)).ttor'lect-account-seanchmertId('ByTesscreen.getexpect(     => {
    (()Foraitwait w
      a
      );
  />"
      md="test-for   formI
       test-user" userId="        Field}
 pdate{mockOnUUpdateField= on       Field}
  electedield={mockStedF      selecrTabs
    eldEditoPalFi       <Payr(
 ende r       
   tup();
 ent.ser = userEv  const use => {
    sync () changes', alectionhant semercle andt('should h    i


    });;cument()eDo)).toBeInThtom_amount'ue('cusyValtByDisplaen.gect(screpent
      ex custom_amoud still betype shoul Payment 

      //ntTab);ck(accoureEvent.cli;
      fi Type')aymentnt & PText('Accoureen.getByab = scst accountTcon   tab
    accounth back to  Switc

      //();mentheDocu).toBeInT Type')'Amountxt(een.getByTexpect(scr
      ecument();oBeInTheDo)).tion'uratunt Configmoom Axt('CustByTen.getect(scree   exp   uration
unt configmo aomcusthould show  S     //
 gTab);
fiick(confireEvent.cl
      ration');ent Configuaym'PyText(en.getB = screigTab  const conf
    n tabonfiguratio cSwitch to  // 

    amount');'custom_peSelect, ns(paymentTytio.selectOpwait user   aise');
   duct_wyValue('proByDisplagetreen.Select = scypeaymentT   const p
   ntcustom_amouto ype  payment t// Change
      });
();
      umentocTheD.toBeInwise'))oduct_ue('prplayValyDis.getBscreenpect(        ex() => {
itFor(ait wa    aw);

  />
      
        form"mId="test-for        "
  -userestserId="t    u     ield}
 kOnUpdateFd={mocFielate      onUpdeld}
    ckSelectedFiedField={mo   select
       absieldEditorTlF   <PayPa     r(
rende    
      ;
  tup()rEvent.seer = useconst us      () => {
 ges', asyncchan tab ate acrosstain stnd maint type apdate paymenould u
    it('sh{ () => nt',ManagemeState cribe('
  des});
  });
    ocument();
TheDse')).toBeInt_wiroduc'pyValue(Displacreen.getBy(s  expect
    duct_wisestill be proshould nt type ved - paymeeserbe prould tate sh      // SuntTab);

click(acco fireEvent.    pe');
 nt Tyt & Paymeount('AcctByTex = screen.ge accountTabst   conunt tab
   o Accoch back tSwit
      // 
ocument();eDeInTh')).toBld BehaviorFieyText('getBpect(screen.    exings
  havior settw bed shoul // Sho
     edTab);
dvancent.click(afireEv      ;
')ngsced Settiext('Advann.getByTcreeancedTab = snst adv
      conced tabtch to AdvaSwi     // ();

 eDocumentThs')).toBeInage Product('ManByTextcreen.get(s  expect;
    nt()eDocumenThtoBeIt')).gemenna Mat('Product.getByTexect(screen   exppe
   ent tyct_wise paym for produanagementow product mhould sh   // S  Tab);

 nfignt.click(coeEve
      fir');gurationment Confi'Payext(yTgetB= screen.figTab  const conn tab
     uratio Configwitch to
      // S);
  }  );
  eDocument(oBeInThon')).tfigurati ConntayPal Paymeext('Pen.getByTect(scre   exp   {
   r(() =>it waitFo  awa

        );/>
         "
 st-formte formId=""
         "test-user     userId=
     pdateField}nUField={mockOonUpdate        
  Field}ockSelectedield={mlectedF          seabs
FieldEditorT <PayPal    
     render() => {
     async (',ing state without losbetween tabsuld switch sho('{
    it () => tion',ga Navi('Tab describe  });

 });

    ent();BeInTheDocumto')).duct_wise'proalue(isplayVgetByDt(screen. expec
     ializederly initproptate is  Check if s  //
     });

     t();InTheDocumenn')).toBeatioonfigurayment CPayPal Pxt('etByTescreen.gpect(  ex=> {
      (() For await wait;

     >
      )        /t-form"
Id="tesform         t-user"
 rId="tes    use
      teField}{mockOnUpdald=onUpdateFie          eld}
dFiSelecteeld={mocktedFiselec  s
        EditorTabld