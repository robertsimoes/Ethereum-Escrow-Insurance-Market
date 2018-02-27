import InsurableTransactionFactory from '../../../../build/contracts/InsurableTransactionFactory.json'
import Transaction from '../../../../build/contracts/Transaction.json'

import store from '../../../store'
const contract = require('truffle-contract')
export const REFRESH_OFFERS = "REFRESH_OFFERS"

/**
 * Returns the payload user to update the redux state
 * @param {array} offers 
 */
function offersRefreshed(offers) {
    return {
      type: REFRESH_OFFERS,
      payload: offers
    }
  }
  
  /**
   * Determines whether or not the status is insured or not
   * @param {string} status 
   */
  function parseInsurance(status) {
    if (status=="0x0000000000000000000000000000000000000000") {
      return false;
    } 

    return true;
  }

  /**
   * Create a set of promises to iterate through and grab relavent contract
   * Then converts these contracts into individual details objects (representing offers)
   * for consumption
   * @param {array} offerAddresses 
   */
  function fetchOfferDetails(offerAddresses) {
    let web3 = store.getState().web3.web3Instance
    let trxn = contract(Transaction)
    trxn.setProvider(web3.currentProvider)

    let getDetails = function getDetails(address) {
      return new Promise((resolve,reject)=>{
        trxn.at(address)
        // Get contract at the specific address and call it's details
          .then((instance)=> {
            instance.getTransactionDetails.call()
            .then(function(results) {
                // resolve promise successfully
                console.log("Results of the instance, single getTransactionDetails are ",results);

                  var insuredStatus = parseInsurance(results[7]);
                  console.log("Insured ", insuredStatus)

                  var details = {
                    address:address,
                    offerName: web3.toAscii(results[0]),
                    description: web3.toAscii(results[1]),
                    val: web3.fromWei(results[2],'ether').toNumber(),
                    maxCoverage:  results[4].toNumber(),
                    terms: results[5].toNumber(),
                    counterParty: results[6],
                    insurance: insuredStatus
                  }

                  console.log(details)

                  resolve(details)
              })
              .catch(function(err) {
                // reject promise.. error
                reject(err)
            })
        })
      })
    }
    
    let actions = offerAddresses.map(getDetails)
    // Call all promises and then publish results. 
    let results = Promise.all(actions)
    return results;
  }

  /** 
   * Refreshes and checks for the offers present in the contract 
  */
  export function refreshOffers() {
    let web3 = store.getState().web3.web3Instance
  
    // Double-check web3's status.
    if (typeof web3 !== 'undefined') {
      
      return function(dispatch) {
        const factory = contract(InsurableTransactionFactory)
        factory.setProvider(web3.currentProvider)
  
        factory.deployed().then(function(instance) {
          instance.getTransactions.call()
            .then(function(result) {

              fetchOfferDetails(result).then(
                data=> {
                  dispatch(offersRefreshed(data))
                })
  
            })
            .catch(function(err) {
              // If error, go to signup page.
              console.error('Error in getting factory ', err)
  
            })
        })
      }
    } else {
      console.error('Web3 is not initialized.');
    }
  }